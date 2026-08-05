// ═══════════════════════════════════════════════════════════════════════════════
// PIXELIZADOR DE CENÁRIOS
// ═══════════════════════════════════════════════════════════════════════════════
// Importa uma imagem grande (tipicamente 2752×1536, saída de gerador de imagem) e a
// converte em pixel art de 16 bits, salvando como cenário utilizável do editor.
//
// O caminho é o mesmo do upload que já existia — POST em /upload_image e registro em
// registrarCenario() — porque cenário pixelizado não é uma categoria nova de coisa: é
// um cenário. A única diferença é que os parâmetros de processamento ficam guardados
// junto, para dar pra reprocessar depois sem pedir o arquivo de novo.
//
// Tudo roda no navegador. O servidor só recebe o PNG pronto.

// ── O worker ────────────────────────────────────────────────────────────────────
// Vai como texto e vira Blob: sem arquivo separado, o build não precisa saber que ele
// existe e não há requisição extra para dar 404 em produção.
//
// Ele devolve a imagem PEQUENA, não a ampliada. Ampliar é um drawImage de milissegundo
// que a thread principal faz na hora de salvar; mandar a versão grande de volta a cada
// ajuste de slider seria transferir dezenas de megabytes à toa.
const PX_WORKER_FONTE = `
// Median cut: divide o cubo de cores em K caixas com quantidade parecida de pixels e
// usa a média de cada caixa como cor da paleta. É adaptativo — nasce da imagem. Uma
// grade fixa de cores desperdiça metade da paleta em tons que a imagem nem tem, e é
// exatamente isso que se vê como faixa suja no céu e na água.
function medianCut(dados, k, vivacidade) {
  const n = dados.length / 4;
  const ordem = new Uint32Array(n);
  for (let i = 0; i < n; i++) ordem[i] = i;

  // Cada caixa é um intervalo dentro de \`ordem\`. Reordenar o intervalo em vez de
  // copiar pixels mantém tudo em memória contígua.
  const caixas = [faixa(0, n)];

  function faixa(ini, fim) {
    let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
    for (let i = ini; i < fim; i++) {
      const p = ordem[i] * 4;
      const r = dados[p], g = dados[p + 1], b = dados[p + 2];
      if (r < rMin) rMin = r; if (r > rMax) rMax = r;
      if (g < gMin) gMin = g; if (g > gMax) gMax = g;
      if (b < bMin) bMin = b; if (b > bMax) bMax = b;
    }
    // Verde pesa mais porque o olho enxerga mais verde: cortar pelo canal de maior
    // amplitude bruta joga precisão fora em azul, que quase ninguém percebe.
    const dr = (rMax - rMin) * 0.30, dg = (gMax - gMin) * 0.59, db = (bMax - bMin) * 0.11;
    const canal = dr >= dg && dr >= db ? 0 : (dg >= db ? 1 : 2);
    return { ini, fim, canal, amplitude: Math.max(dr, dg, db) };
  }

  while (caixas.length < k) {
    // Escolhe pela amplitude PESADA PELA POPULAÇÃO. Só por amplitude, a paleta inteira
    // ia para punhados de pixels de cor extrema — um brilho de metal, uma flor — e as
    // grandes áreas de telhado, grama e pedra dividiam duas ou três cores entre si.
    // Era daí que vinha o mapa lavado: o que ocupa a tela é justamente o que perdia cor.
    // A raiz cúbica evita o oposto, que seria o céu comer a paleta toda por ser grande.
    let alvo = -1, maior = -1;
    for (let i = 0; i < caixas.length; i++) {
      const c = caixas[i];
      if (c.fim - c.ini <= 1) continue;
      const peso = c.amplitude * Math.cbrt(c.fim - c.ini);
      if (peso > maior) { maior = peso; alvo = i; }
    }
    if (alvo < 0) break;   // nada mais divisível: a imagem tem menos cores que K

    const c = caixas[alvo];
    const off = c.canal;
    const fatia = Array.from(ordem.subarray(c.ini, c.fim));
    fatia.sort((a, b) => dados[a * 4 + off] - dados[b * 4 + off]);
    ordem.set(fatia, c.ini);

    const meio = c.ini + ((c.fim - c.ini) >> 1);
    caixas[alvo] = faixa(c.ini, meio);
    caixas.push(faixa(meio, c.fim));
  }

  // Pinta cada pixel com a média da sua caixa. Não há busca de cor mais próxima:
  // o pixel já sabe a que caixa pertence, então o resultado é exato e instantâneo.
  const paleta = [];
  for (const c of caixas) {
    let sr = 0, sg = 0, sb = 0;
    const total = c.fim - c.ini;
    for (let i = c.ini; i < c.fim; i++) {
      const p = ordem[i] * 4;
      sr += dados[p]; sg += dados[p + 1]; sb += dados[p + 2];
    }
    let r = sr / total, g = sg / total, b = sb / total;

    // Média de cores é sempre menos saturada que as cores que ela resume: misturar
    // dois tons de telhado dá um tom mais cinza que os dois. Repetido 48 vezes, é isso
    // que tira a graça do mapa. Aqui a distância de cada canal ao cinza da caixa é
    // esticada de volta, o que devolve a viveza sem inventar cor que não existia.
    const cinza = r * 0.30 + g * 0.59 + b * 0.11;
    r = cinza + (r - cinza) * vivacidade;
    g = cinza + (g - cinza) * vivacidade;
    b = cinza + (b - cinza) * vivacidade;
    r = Math.max(0, Math.min(255, Math.round(r)));
    g = Math.max(0, Math.min(255, Math.round(g)));
    b = Math.max(0, Math.min(255, Math.round(b)));
    paleta.push([r, g, b]);
    for (let i = c.ini; i < c.fim; i++) {
      const p = ordem[i] * 4;
      dados[p] = r; dados[p + 1] = g; dados[p + 2] = b; dados[p + 3] = 255;
    }
  }
  return paleta;
}

self.onmessage = (ev) => {
  const { bitmap, fator, cores, vivacidade, pedido } = ev.data;
  try {
    // Arredonda para baixo: 2752/5 dá 550,4 e meio pixel não existe. O aviso de que
    // sobrou borda é dado na interface, com os números.
    const larg = Math.max(1, Math.floor(bitmap.width / fator));
    const alt = Math.max(1, Math.floor(bitmap.height / fator));

    // 1. Redução com vizinho mais próximo. Suavizar aqui faria média entre pixels
    // vizinhos e devolveria uma foto pequena e borrada em vez de pixel art.
    const tela = new OffscreenCanvas(larg, alt);
    const cx = tela.getContext('2d', { willReadFrequently: true });
    cx.imageSmoothingEnabled = false;
    cx.drawImage(bitmap, 0, 0, larg, alt);

    // 2. Quantização adaptativa, sem dithering.
    const img = cx.getImageData(0, 0, larg, alt);
    const paleta = medianCut(img.data, cores, vivacidade);
    cx.putImageData(img, 0, 0);

    const saida = tela.transferToImageBitmap();
    self.postMessage({ pedido, bitmap: saida, larg, alt, paleta: paleta.length }, [saida]);
  } catch (e) {
    self.postMessage({ pedido, erro: String(e && e.message || e) });
  } finally {
    bitmap.close();
  }
};
`;

const PX = {
  worker: null,
  pedido: 0,          // carimbo para descartar resposta de ajuste já superado
  arquivo: null,      // File original, quando veio de upload
  original: null,     // ImageBitmap do original, reusado a cada reprocessamento
  originalUrl: null,  // caminho salvo do original, para reprocessar depois
  pequeno: null,      // ImageBitmap processado (tamanho reduzido)
  nomeArquivo: '',
  chaveExistente: null,  // preenchido quando está reprocessando um cenário já salvo
  ocupado: false,
};

const PX_LIMITE_TEXTURA = 8192;   // GPUs antigas não carregam textura maior que isso

function pxWorker() {
  if (PX.worker) return PX.worker;
  const url = URL.createObjectURL(new Blob([PX_WORKER_FONTE], { type: 'text/javascript' }));
  PX.worker = new Worker(url);
  URL.revokeObjectURL(url);
  PX.worker.onmessage = (ev) => pxRecebeu(ev.data);
  return PX.worker;
}

// ── Interface ───────────────────────────────────────────────────────────────────
function pxEl(id) { return document.getElementById(id); }

function abrirPixelizador() {
  const modal = pxEl('pixelizadorModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  pxAtualizaListaReprocessar();
  if (!PX.original) pxEstado('Escolha uma imagem para começar.');
}

function fecharPixelizador() {
  pxEl('pixelizadorModal')?.classList.add('hidden');
}

function pxEstado(txt, tipo = '') {
  const el = pxEl('pxEstado');
  if (!el) return;
  el.textContent = txt;
  el.className = 'px-estado' + (tipo ? ' ' + tipo : '');
}

function pxAvisos(lista) {
  const el = pxEl('pxAvisos');
  if (!el) return;
  el.innerHTML = '';
  for (const t of lista) {
    const d = document.createElement('div');
    d.className = 'px-aviso';
    d.textContent = '⚠️ ' + t;
    el.appendChild(d);
  }
}

// Desenha uma imagem cabendo na tela de prévia, mantendo proporção. `nitido` desliga a
// suavização — é o que faz a prévia processada mostrar bloco de pixel de verdade em
// vez de uma versão borrada que mentiria sobre o resultado.
function pxDesenhaPrevia(canvas, fonte, nitido) {
  if (!canvas || !fonte) return;
  const cx = canvas.getContext('2d');
  const cw = canvas.width, ch = canvas.height;
  cx.clearRect(0, 0, cw, ch);
  cx.imageSmoothingEnabled = !nitido;
  const escala = Math.min(cw / fonte.width, ch / fonte.height);
  const w = Math.round(fonte.width * escala), h = Math.round(fonte.height * escala);
  cx.drawImage(fonte, Math.round((cw - w) / 2), Math.round((ch - h) / 2), w, h);
}

function pxParams() {
  return {
    fator: parseInt(pxEl('pxFator').value, 10),
    cores: parseInt(pxEl('pxCores').value, 10),
    vivacidade: parseFloat(pxEl('pxVivacidade').value),
  };
}

// ── Carregar a imagem de origem ─────────────────────────────────────────────────
async function pxCarregarBitmap(fonte, nome) {
  try {
    const bmp = await createImageBitmap(fonte);
    if (PX.original) PX.original.close();
    PX.original = bmp;
    PX.nomeArquivo = nome;
    pxDesenhaPrevia(pxEl('pxPreviaOriginal'), bmp, false);
    pxEl('pxDimOriginal').textContent = `${bmp.width} × ${bmp.height}`;
    pxProcessar();
  } catch (e) {
    pxEstado('Não consegui ler essa imagem: ' + e.message, 'erro');
  }
}

function pxEscolherArquivo(file) {
  if (!file || !file.type.startsWith('image/')) {
    pxEstado('Selecione um arquivo de imagem (.png ou .jpg).', 'erro');
    return;
  }
  PX.arquivo = file;
  PX.originalUrl = null;
  PX.chaveExistente = null;
  const limpo = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-\s]/g, '');
  const campo = pxEl('pxNome');
  if (campo && !campo.value.trim()) campo.value = limpo || 'Cenário Pixel Art';
  pxCarregarBitmap(file, limpo);
}

// ── Processamento ───────────────────────────────────────────────────────────────
function pxProcessar() {
  if (!PX.original) return;
  const { fator, cores, vivacidade } = pxParams();
  pxEl('pxFatorVal').textContent = fator + '×';
  pxEl('pxCoresVal').textContent = cores;
  pxEl('pxVivacidadeVal').textContent = Math.round(vivacidade * 100) + '%';

  const w = PX.original.width, h = PX.original.height;
  const avisos = [];
  if (w > PX_LIMITE_TEXTURA || h > PX_LIMITE_TEXTURA) {
    avisos.push(`A imagem tem ${w}×${h}. Acima de ${PX_LIMITE_TEXTURA}px, placas de vídeo ` +
                `antigas não conseguem carregar a textura e o cenário aparece em branco ` +
                `no celular de alguns alunos.`);
  }
  const sobraX = w % fator, sobraY = h % fator;
  if (sobraX || sobraY) {
    avisos.push(`${w}×${h} não divide certo por ${fator}: sobram ${sobraX}px na largura e ` +
                `${sobraY}px na altura. Arredondei para baixo — o resultado fica ` +
                `${Math.floor(w / fator) * fator}×${Math.floor(h / fator) * fator}.`);
  }
  pxAvisos(avisos);

  // O bitmap é transferível, então some da thread principal quando vai para o worker.
  // Como cada ajuste de slider reprocessa, mando uma CÓPIA e guardo o original aqui.
  const pedido = ++PX.pedido;
  PX.ocupado = true;
  pxEstado('Processando…');
  createImageBitmap(PX.original).then(copia => {
    pxWorker().postMessage({ bitmap: copia, fator, cores, vivacidade, pedido }, [copia]);
  });
}

function pxRecebeu(msg) {
  if (msg.pedido !== PX.pedido) return;   // chegou atrasado, o usuário já mexeu de novo
  PX.ocupado = false;
  if (msg.erro) { pxEstado('Falhou: ' + msg.erro, 'erro'); return; }

  if (PX.pequeno) PX.pequeno.close();
  PX.pequeno = msg.bitmap;
  pxDesenhaPrevia(pxEl('pxPreviaProcessada'), msg.bitmap, true);

  const { fator } = pxParams();
  pxEl('pxDimProcessada').textContent =
    `${msg.larg} × ${msg.alt} px reais → ${msg.larg * fator} × ${msg.alt * fator}`;
  pxEstado(`Pronto: ${msg.larg * msg.alt} pixels em ${msg.paleta} cores.`, 'ok');
  pxEl('pxSalvar').disabled = false;
}

// Amplia de volta ao tamanho de tela. Vizinho mais próximo de novo: é essa segunda
// passagem sem suavização que transforma o pixel reduzido em bloco quadrado nítido.
function pxTexturaFinal() {
  const { fator } = pxParams();
  const cv = document.createElement('canvas');
  cv.width = PX.pequeno.width * fator;
  cv.height = PX.pequeno.height * fator;
  const cx = cv.getContext('2d');
  cx.imageSmoothingEnabled = false;
  cx.drawImage(PX.pequeno, 0, 0, cv.width, cv.height);
  return cv;
}

// ── Salvar ──────────────────────────────────────────────────────────────────────
async function pxEnviar(nomeArquivo, dataUrl) {
  try {
    const res = await fetch('/upload_image', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: nomeArquivo, image: dataUrl }),
    });
    const data = await res.json();
    if (data.status === 'ok' && data.url) return data.url;
  } catch (e) {}
  return null;   // sem servidor (Vercel, tablet): fica o data URL mesmo
}

async function pxSalvar() {
  if (!PX.pequeno) return;
  const botao = pxEl('pxSalvar');
  botao.disabled = true;
  pxEstado('Salvando…');

  const { fator, cores, vivacidade } = pxParams();
  const nome = (pxEl('pxNome').value || '').trim() || PX.nomeArquivo || 'Cenário Pixel Art';
  const chave = PX.chaveExistente || `custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // PNG, não JPG: JPG inventa gradiente entre blocos de cor chapada e desfaz na
  // compressão exatamente a paleta que o median cut acabou de construir.
  const dataUrl = pxTexturaFinal().toDataURL('image/png');
  const url = await pxEnviar(`bg_${chave}.png`, dataUrl) || dataUrl;

  // Guarda o original uma vez só, para o reprocessamento futuro ter de onde partir.
  let origUrl = PX.originalUrl;
  if (!origUrl && PX.arquivo) {
    const lido = await new Promise(ok => {
      const fr = new FileReader();
      fr.onload = e => ok(e.target.result);
      fr.readAsDataURL(PX.arquivo);
    });
    origUrl = await pxEnviar(`orig_${chave}.jpg`, lido);
  }

  pixelArt[chave] = {
    fator, cores, vivacidade,
    original: origUrl || null,
    largura: PX.pequeno.width * fator,
    altura: PX.pequeno.height * fator,
    criadoEm: new Date().toISOString(),
  };

  if (PX.chaveExistente) {
    // Reprocessamento: o cenário já existe no grid, só a imagem muda. Trocar a chave
    // aqui apagaria a posição, os spawns e as passagens que já foram configurados.
    bgSources[chave] = url;
    const img = new Image();
    img.src = url + (url.startsWith('data:') ? '' : '?t=' + Date.now());
    bgImages[chave] = img;
    saveAllLayers(false);
    if (typeof weAtualizaGaleria === 'function') weAtualizaGaleria();
    showToast(`🎨 "${SCENE_NAMES[chave]}" reprocessado em ${fator}× / ${cores} cores.`);
  } else {
    registrarCenario(chave, url, nome);
    showToast(`🎨 Cenário "${SCENE_NAMES[chave]}" pixelizado e salvo!`);
  }

  botao.disabled = false;
  pxEstado('Salvo.', 'ok');
  pxAtualizaListaReprocessar();
  fecharPixelizador();
}

// ── Reprocessar um cenário já salvo ─────────────────────────────────────────────
function pxAtualizaListaReprocessar() {
  const sel = pxEl('pxReprocessar');
  if (!sel) return;
  const chaves = Object.keys(pixelArt).filter(k => pixelArt[k] && pixelArt[k].original);
  sel.innerHTML = '<option value="">— novo cenário —</option>';
  for (const k of chaves) {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = `${SCENE_NAMES[k] || k} (${pixelArt[k].fator}× / ${pixelArt[k].cores} cores)`;
    sel.appendChild(o);
  }
  sel.parentElement.style.display = chaves.length ? '' : 'none';
}

async function pxAbrirExistente(chave) {
  const info = pixelArt[chave];
  if (!info || !info.original) return;
  PX.chaveExistente = chave;
  PX.arquivo = null;
  PX.originalUrl = info.original;
  pxEl('pxFator').value = info.fator;
  pxEl('pxCores').value = info.cores;
  pxEl('pxVivacidade').value = info.vivacidade ?? 1.18;
  pxEl('pxNome').value = (SCENE_NAMES[chave] || '').replace(/^\S+\s/, '');
  pxEstado('Carregando o original…');
  try {
    const r = await fetch(info.original);
    await pxCarregarBitmap(await r.blob(), chave);
  } catch (e) {
    pxEstado('Não achei o arquivo original deste cenário: ' + info.original, 'erro');
  }
}

// ── Ligações ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  pxEl('pixelizarScenarioBtn')?.addEventListener('click', abrirPixelizador);
  pxEl('pxFechar')?.addEventListener('click', fecharPixelizador);
  pxEl('pixelizadorModal')?.addEventListener('click', e => {
    if (e.target.id === 'pixelizadorModal') fecharPixelizador();
  });

  const entrada = pxEl('pxArquivo');
  pxEl('pxEscolher')?.addEventListener('click', () => entrada?.click());
  entrada?.addEventListener('change', e => {
    if (e.target.files?.length) pxEscolherArquivo(e.target.files[0]);
    e.target.value = '';
  });

  // Arrastar direto para o painel, que é como a maioria das imagens chega.
  const zona = pxEl('pxZona');
  zona?.addEventListener('dragover', e => { e.preventDefault(); zona.classList.add('sobre'); });
  zona?.addEventListener('dragleave', () => zona.classList.remove('sobre'));
  zona?.addEventListener('drop', e => {
    e.preventDefault(); zona.classList.remove('sobre');
    if (e.dataTransfer.files?.length) pxEscolherArquivo(e.dataTransfer.files[0]);
  });

  // `input` reprocessa ao vivo enquanto arrasta. O worker segura o tranco; se chegar
  // resposta de um ajuste já superado, pxRecebeu descarta pelo número do pedido.
  pxEl('pxFator')?.addEventListener('input', pxProcessar);
  pxEl('pxCores')?.addEventListener('input', pxProcessar);
  pxEl('pxVivacidade')?.addEventListener('input', pxProcessar);

  pxEl('pxSalvar')?.addEventListener('click', pxSalvar);

  // ── Tamanho do herói ──────────────────────────────────────────────────────────
  // Mora aqui e não no game.js porque é controle do editor: no build dos alunos os
  // elementos nem existem, e o jogo lê a escala já salva no config do mundo.
  const salvo = localStorage.getItem('acordelot_heroi_escala');
  if (salvo) aplicarEscalaHeroi(salvo, false);
  else aplicarEscalaHeroi(heroiEscala, false);   // só para o rótulo nascer certo
  pxEl('heroiEscala')?.addEventListener('input', e => aplicarEscalaHeroi(e.target.value));
  pxEl('heroiEscalaReset')?.addEventListener('click', () => aplicarEscalaHeroi(1));

  // ── Zoom do cenário e passagem do tempo ───────────────────────────────────────
  const zoomSalvo = localStorage.getItem('acordelot_zoom_cenario');
  aplicarZoomCenario(zoomSalvo || zoomCenario, false);
  pxEl('zoomCenario')?.addEventListener('input', e => aplicarZoomCenario(e.target.value));

  const chkTempo = pxEl('tempoLigado');
  if (chkTempo) {
    chkTempo.checked = TEMPO_LIGADO;
    chkTempo.addEventListener('change', e => {
      TEMPO_LIGADO = e.target.checked;
      showToast(TEMPO_LIGADO ? '🌗 Passagem do tempo ligada.' : '☀️ Passagem do tempo desligada.');
      saveAllLayers(false);
    });
  }

  // ── Editor recolhível ─────────────────────────────────────────────────────────
  // O canvas muda de tamanho ao recolher, e a resolução real dele é recalculada por
  // setupHighDPICanvas. O ResizeObserver já instalado dispara sozinho — o timeout só
  // garante que a medida seja tirada DEPOIS da transição, não no meio dela.
  const recolher = (forcar) => {
    const fechado = forcar !== undefined ? forcar : !document.body.classList.contains('editor-recolhido');
    document.body.classList.toggle('editor-recolhido', fechado);
    const b = pxEl('drawerToggle');
    if (b) { b.textContent = fechado ? '▶' : '◀'; }
  };
  pxEl('drawerToggle')?.addEventListener('click', () => recolher());
  // NÃO se lembra de estar recolhido entre sessões. Guardar isso fazia o editor abrir
  // sem lateral nenhuma, e quem abrisse o app no dia seguinte encontrava uma tela de
  // jogo sem ferramenta e sem pista do motivo. Recolher é um gesto do momento.
  try { localStorage.removeItem('acordelot_editor_recolhido'); } catch (e) {}

  // TAB recolhe a gaveta. Era o E, que já era a tecla de AGIR no jogo — falar, entrar,
  // coletar. Uma tecla com dois donos sempre atende ao dono errado.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const alvo = e.target;
    if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable)) return;
    recolher();
  });
  pxEl('pxReprocessar')?.addEventListener('change', e => {
    if (e.target.value) pxAbrirExistente(e.target.value);
  });
});

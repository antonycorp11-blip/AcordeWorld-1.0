#!/usr/bin/env python3
"""
Acordelot Engine — Persistent HTTP Server
Handles game assets, layer saves, NPC data, world config.
"""
import http.server
import socketserver
import json
import base64
import os
import re

PORT = 8085
DIRECTORY = '/Users/aquillesantony/Downloads/wasd_game'

class GameHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        print(f"[{self.address_string()}] {format % args}")

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        try:
            data = json.loads(body)
        except Exception:
            self.send_error(400, 'Invalid JSON')
            return

        if self.path == '/save_layers':
            self._save_layers(data)
        elif self.path == '/save_npcs':
            self._save_npcs(data)
        elif self.path == '/save_monsters':
            self._save_monsters(data)
        elif self.path == '/save_objects':
            self._save_objects(data)
        elif self.path == '/save_mundo':
            self._save_mundo(data)
        elif self.path == '/save_pintura':
            self._save_pintura(data)
        elif self.path == '/save_dialogue':
            self._save_dialogue(data)
        elif self.path == '/upload_image':
            self._upload_image(data)
        else:
            self.send_error(404, 'Unknown endpoint')

    def _upload_image(self, data):
        try:
            assets_dir = os.path.join(DIRECTORY, 'assets')
            os.makedirs(assets_dir, exist_ok=True)
            filename = data.get('filename', f"custom_bg_{int(os.times().user * 1000)}.jpg")
            filename = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', filename)
            img_b64 = data.get('image', '')
            if ',' in img_b64:
                img_b64 = img_b64.split(',', 1)[1]
            fpath = os.path.join(assets_dir, filename)
            img_data = base64.b64decode(img_b64)
            with open(fpath, 'wb') as f:
                f.write(img_data)
            url = f"assets/{filename}"
            print(f"[Server] Uploaded image saved: {url}")
            self._ok({'status': 'ok', 'url': url, 'filename': filename})
        except Exception as e:
            print(f"[Server] Error uploading image: {e}")
            self.send_error(500, str(e))

    def _save_layers(self, data):
        try:
            assets_dir = os.path.join(DIRECTORY, 'assets')
            os.makedirs(assets_dir, exist_ok=True)

            # Save world config. Um POST sem cenários é sempre erro (aba velha, teste,
            # requisição truncada) e apagaria o mundo inteiro — recusa em vez de gravar.
            cfg = data.get('worldConfig')
            if cfg is not None:
                if isinstance(cfg, dict) and cfg.get('gridPos'):
                    cfg_path = os.path.join(assets_dir, 'acordelot_world_config.json')
                    self._backup(cfg_path)
                    with open(cfg_path, 'w') as f:
                        json.dump(cfg, f, indent=2, ensure_ascii=False)
                    print("[Server] World config saved.")
                else:
                    print("[Server] RECUSADO: worldConfig vazio ou sem gridPos.")

            # Save canvas layer images
            pattern = re.compile(r'^(road|fg|door)_([0-9]+_[0-9]+)$')
            saved = []
            for key, val in data.items():
                m = pattern.match(key)
                if m and isinstance(val, str) and val.startswith('data:image/png;base64,'):
                    layer_type = m.group(1)
                    map_key = m.group(2)
                    fname = f'acordelot_{layer_type}_{map_key}_mask.png'
                    fpath = os.path.join(assets_dir, fname)
                    img_data = base64.b64decode(val.split(',', 1)[1])
                    with open(fpath, 'wb') as f:
                        f.write(img_data)
                    saved.append(fname)

            if saved:
                print(f"[Server] Saved layers: {', '.join(saved)}")

            self._ok({'status': 'ok', 'saved': len(saved)})
        except Exception as e:
            print(f"[Server] Error saving layers: {e}")
            self.send_error(500, str(e))

    def _backup(self, caminho):
        """Guarda a versão anterior antes de sobrescrever. Uma aba antiga, um teste ou
        uma requisição errada já custaram trabalho perdido; com isto sempre dá para voltar."""
        try:
            if not os.path.exists(caminho):
                return
            import time
            pasta = os.path.join(DIRECTORY, 'assets', '_backups')
            os.makedirs(pasta, exist_ok=True)
            nome = os.path.basename(caminho)
            carimbo = time.strftime('%Y%m%d-%H%M%S')
            destino = os.path.join(pasta, f'{carimbo}-{nome}')
            with open(caminho, 'rb') as origem, open(destino, 'wb') as saida:
                saida.write(origem.read())
            # mantém só as 40 mais recentes de cada arquivo
            antigas = sorted(f for f in os.listdir(pasta) if f.endswith('-' + nome))
            for f in antigas[:-40]:
                try: os.remove(os.path.join(pasta, f))
                except OSError: pass
        except Exception as e:
            print(f'[Server] backup falhou: {e}')

    def _save_npcs(self, data):
        try:
            assets_dir = os.path.join(DIRECTORY, 'assets')
            os.makedirs(assets_dir, exist_ok=True)
            npc_path = os.path.join(assets_dir, 'npcs.json')
            self._backup(npc_path)
            count = len(data.get('npcs', []))
            # Lista vazia nunca é intencional: seria apagar todos os NPCs do jogo.
            if count == 0:
                print("[Server] RECUSADO: npcs.json vazio.")
                self._ok({'status': 'ignorado', 'count': 0})
                return
            with open(npc_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"[Server] NPCs saved: {count} NPC(s).")
            self._ok({'status': 'ok', 'count': count})
        except Exception as e:
            print(f"[Server] Error saving NPCs: {e}")
            self.send_error(500, str(e))

    def _save_monsters(self, data):
        try:
            assets_dir = os.path.join(DIRECTORY, 'assets')
            os.makedirs(assets_dir, exist_ok=True)
            path = os.path.join(assets_dir, 'monsters.json')
            self._backup(path)
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            count = len(data.get('spawns', []))
            print(f"[Server] Monsters saved: {count} spawn(s).")
            self._ok({'status': 'ok', 'count': count})
        except Exception as e:
            print(f"[Server] Error saving monsters: {e}")
            self.send_error(500, str(e))

    def _save_objects(self, data):
        try:
            assets_dir = os.path.join(DIRECTORY, 'assets')
            os.makedirs(assets_dir, exist_ok=True)
            path = os.path.join(assets_dir, 'objects.json')
            self._backup(path)
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            count = len(data.get('objetos', []))
            print(f"[Server] Objects saved: {count} objeto(s).")
            self._ok({'status': 'ok', 'count': count})
        except Exception as e:
            print(f"[Server] Error saving objects: {e}")
            self.send_error(500, str(e))

    def _save_mundo(self, data):
        try:
            pasta = os.path.join(DIRECTORY, 'assets', 'mundo')
            os.makedirs(os.path.join(pasta, 'chunks'), exist_ok=True)
            path = os.path.join(pasta, 'mundo.json')
            self._backup(path)
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"[Server] Mundo saved: {len(data.get('props', []))} prop(s), "
                  f"{data.get('cols')}x{data.get('rows')} blocos.")
            self._ok({'status': 'ok'})
        except Exception as e:
            print(f"[Server] Error saving mundo: {e}")
            self.send_error(500, str(e))

    def _save_pintura(self, data):
        """Uma imagem por bloco pintado. Guardo o PNG pronto em vez de uma lista de
        pinceladas: o traço já está rasterizado, carrega na hora e não depende de
        reproduzir a ordem exata dos carimbos."""
        try:
            import base64
            chave = str(data.get('chave', '')).replace('/', '')
            png = data.get('png', '')
            if not chave or not png.startswith('data:image/png;base64,'):
                self.send_error(400, 'pintura invalida'); return
            pasta = os.path.join(DIRECTORY, 'assets', 'mundo', 'pintura')
            os.makedirs(pasta, exist_ok=True)
            caminho = os.path.join(pasta, f'{chave}.png')
            with open(caminho, 'wb') as f:
                f.write(base64.b64decode(png.split(',', 1)[1]))
            print(f"[Server] Pintura salva: bloco {chave}")
            self._ok({'status': 'ok'})
        except Exception as e:
            print(f"[Server] Error saving pintura: {e}")
            self.send_error(500, str(e))

    def _save_dialogue(self, data):
        try:
            dlg_id = data.get('id', 'custom_dialogue')
            dialogue_content = data.get('dialogue', {})
            dlg_dir = os.path.join(DIRECTORY, 'assets', 'dialogues')
            os.makedirs(dlg_dir, exist_ok=True)
            fpath = os.path.join(dlg_dir, f"{dlg_id}.json")
            with open(fpath, 'w', encoding='utf-8') as f:
                json.dump(dialogue_content, f, indent=2, ensure_ascii=False)
            print(f"[Server] Dialogue '{dlg_id}.json' saved.")
            self._ok({'status': 'ok', 'id': dlg_id})
        except Exception as e:
            print(f"[Server] Error saving dialogue: {e}")
            self.send_error(500, str(e))

    def _ok(self, payload):
        body = json.dumps(payload).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


if __name__ == '__main__':
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(('', PORT), GameHandler) as httpd:
        httpd.allow_reuse_address = True
        print(f"\n{'='*50}")
        print(f"  🎵 Acordelot Engine — Servidor HTTP")
        print(f"  http://localhost:{PORT}")
        print(f"  Diretório: {DIRECTORY}")
        print(f"{'='*50}\n")
        httpd.serve_forever()

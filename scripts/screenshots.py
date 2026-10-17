"""
Görsel QA: web derlemesini (dist/web) küçük ve büyük telefon boyutlarında açıp ekran görüntüsü alır.
Kullanım: python3 scripts/screenshots.py <dist/web> <çıktı klasörü>
Not: Web yalnızca düzen kontrolü içindir; hedef platform Android/iOS'tur.
"""
import http.server
import json
import os
import socketserver
import sys
import threading
from functools import partial

from playwright.sync_api import sync_playwright

root, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)


class SPA(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path.split("?")[0])
        if not os.path.exists(path) and "." not in os.path.basename(path):
            self.path = "/index.html"
        return super().send_head()

    def log_message(self, *a):
        pass


httpd = socketserver.TCPServer(("127.0.0.1", 0), partial(SPA, directory=root))
port = httpd.server_address[1]
threading.Thread(target=httpd.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{port}"

SELECTED = {
    "v": 1,
    "data": {
        "selected": {
            "id": "TR:47:midyat",
            "country": "TR",
            "provinceCode": "47",
            "provinceName": "Mardin",
            "districtName": "Midyat",
            "lat": 37.41908,
            "lon": 41.33909,
            "quality": "geonames",
            "timeZone": "Europe/Istanbul",
        },
        "favorites": [],
        "recents": [],
    },
}

shots = [
    ("01-ana-sayfa-bos", "/", None, "light"),
    ("02-ana-sayfa", "/", SELECTED, "light"),
    ("03-ana-sayfa-koyu", "/", SELECTED, "dark"),
    ("04-konum-sec", "/location", SELECTED, "light"),
    ("05-takvim", "/prayer-calendar", SELECTED, "light"),
    ("06-tesbih", "/tesbih", SELECTED, "light"),
    ("07-kible", "/qibla", SELECTED, "light"),
    ("08-profil", "/profile", SELECTED, "light"),
    ("09-kuran", "/quran", SELECTED, "dark"),
    ("10-bildirimler", "/notifications", SELECTED, "light"),
]
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for vw, vh, tag in [(360, 740, "kucuk"), (412, 915, "buyuk")]:
        for name, route, sel, scheme in shots:
            ctx = b.new_context(viewport={"width": vw, "height": vh}, device_scale_factor=2, color_scheme=scheme, locale="tr-TR", timezone_id="Europe/Istanbul")
            page = ctx.new_page()
            page.on("pageerror", lambda e, n=name: errors.append(f"{n}: {e}"))
            page.goto(base + "/")
            page.evaluate("localStorage.clear()")
            if sel:
                page.evaluate("([k,v]) => localStorage.setItem(k, v)", ["ev571:location", json.dumps(sel)])
            page.goto(base + route)
            page.wait_for_timeout(1800)
            if name == "04-konum-sec" and tag == "kucuk":
                page.screenshot(path=f"{out}/{name}-{tag}.png")
                page.get_by_placeholder("İl, ilçe, mahalle, köy veya posta kodu").fill("cumhuriyet midyat")
                page.wait_for_timeout(1500)
                name = "04b-konum-arama"
            page.screenshot(path=f"{out}/{name}-{tag}.png")
            # yatay taşma kontrolü
            overflow = page.evaluate("document.documentElement.scrollWidth > window.innerWidth")
            if overflow:
                errors.append(f"{name}-{tag}: yatay taşma")
            ctx.close()
    b.close()
httpd.shutdown()
print(json.dumps({"errors": errors}, ensure_ascii=False, indent=1))

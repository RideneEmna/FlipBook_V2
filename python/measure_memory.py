"""
Mesure le pic de mémoire d'une vraie conversion (phase 0 (b), section 10 du plan).

Usage, depuis le dossier python, venv actif :
    pip install psutil
    python measure_memory.py "C:\\chemin\\vers\\manuel.pdf" 300

Le second argument (DPI) est facultatif ; 300 est la valeur réelle d'utilisation.
Les résultats sont écrits dans tmp_data\\memory_test (supprimez-le ensuite).
"""
import shutil
import sys
import threading
import time
from pathlib import Path

import psutil

from core.render import render_pdf


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    pdf = sys.argv[1].strip().strip('"')
    dpi = int(sys.argv[2]) if len(sys.argv) > 2 else 300
    out = Path("tmp_data") / "memory_test"
    shutil.rmtree(out, ignore_errors=True)

    proc = psutil.Process()
    peak = {"rss": proc.memory_info().rss}
    stop = threading.Event()

    def sample() -> None:
        while not stop.is_set():
            peak["rss"] = max(peak["rss"], proc.memory_info().rss)
            time.sleep(0.1)

    threading.Thread(target=sample, daemon=True).start()
    start = time.time()
    result = render_pdf(pdf, out, dpi=dpi, quality=85)
    stop.set()

    mb = 1024 * 1024
    print(f"Pages : {result['totalPages']} à {dpi} DPI en {time.time() - start:.0f} s")
    print(f"Pic de mémoire (RSS) : {peak['rss'] / mb:.0f} Mo")
    print(f"Taille du dossier de sortie : {sum(f.stat().st_size for f in out.rglob('*') if f.is_file()) / mb:.0f} Mo")


if __name__ == "__main__":
    main()

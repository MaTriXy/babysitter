import argparse
import re
from pathlib import Path


def read_text(path: Path) -> str:
    raw = path.read_bytes()
    if raw.startswith(b"\xff\xfe") or raw.startswith(b"\xfe\xff"):
        return raw.decode("utf-16")
    if raw.startswith(b"\xef\xbb\xbf"):
        return raw.decode("utf-8-sig", errors="replace")
    return raw.decode("utf-8", errors="replace")


REPLACEMENTS = [
    # Common mojibake for dashes/ellipsis
    (r"ÔÇô|ÔÇö|â€“|â€”", "-"),
    (r"ÔÇª|â€¦", "..."),
    # Seen in some outputs when an en-dash leaks an embedded quote; replace whole sequence.
    (r"ا\"اخaُ", "-"),
    (r"ا\"اخa", "-"),
    (r"ا\"اخ", "-"),
]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="in_path", required=True)
    parser.add_argument("--out", dest="out_path", required=True)
    args = parser.parse_args()

    text = read_text(Path(args.in_path))
    for pattern, repl in REPLACEMENTS:
        text = re.sub(pattern, repl, text)
    Path(args.out_path).write_text(text, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


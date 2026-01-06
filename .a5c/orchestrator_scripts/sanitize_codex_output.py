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


def sanitize_lines(lines: list[str]) -> list[str]:
    out: list[str] = []
    skip_next_numeric = False
    for line in lines:
        # Remove standalone comma-grouped numeric lines (often "tokens used" counts that slip in).
        if re.fullmatch(r"\s*\d{1,3}(,\d{3})+\s*\r?\n?", line):
            continue
        if skip_next_numeric:
            if re.fullmatch(r"\s*\d[\d,]*\s*", line):
                skip_next_numeric = False
                continue
            skip_next_numeric = False
        if re.fullmatch(r"\s*tokens used\s*", line, flags=re.IGNORECASE):
            skip_next_numeric = True
            continue
        out.append(line)
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="in_path", required=True)
    parser.add_argument("--out", dest="out_path", required=True)
    args = parser.parse_args()

    in_path = Path(args.in_path)
    out_path = Path(args.out_path)

    text = read_text(in_path)
    lines = text.splitlines(keepends=True)
    cleaned = sanitize_lines(lines)
    out_path.write_text("".join(cleaned), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

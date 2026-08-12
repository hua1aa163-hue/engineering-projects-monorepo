from __future__ import annotations

import json
import os
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


INVENTORY = Path(r"D:\CHATGPT_file\else thing\outputs\cip_file_table\inventory.json")
ROOT = Path(r"\\192.168.1.92\310_共享\999_Process_Control_Board\99_Continous_Improving_Program(CIP)\02_测试专题提升")


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def unique(items: list[str], limit: int = 5000) -> str:
    out: list[str] = []
    seen: set[str] = set()
    used = 0
    for item in items:
        item = clean(item)
        if len(item) < 2 or item in seen:
            continue
        seen.add(item)
        remaining = limit - used
        if remaining <= 0:
            break
        out.append(item[:remaining])
        used += min(len(item), remaining)
    return " | ".join(out)


def xml_text(blob: bytes) -> list[str]:
    root = ET.fromstring(blob)
    values: list[str] = []
    for elem in root.iter():
        if elem.text and elem.tag.rsplit("}", 1)[-1] in {"t", "v"}:
            values.append(elem.text)
    return values


def raw_openxml(path: Path) -> tuple[str, dict]:
    ext = path.suffix.lower()
    with zipfile.ZipFile(path) as zf:
        names = zf.namelist()
        chunks: list[str] = []
        meta: dict = {"status": "ok_raw_openxml"}
        if ext == ".pptx":
            slide_files = sorted(
                n for n in names
                if re.fullmatch(r"ppt/slides/slide\d+\.xml", n, flags=re.I)
            )
            for name in slide_files[:60]:
                chunks.extend(xml_text(zf.read(name)))
                if sum(map(len, chunks)) >= 7000:
                    break
            meta["slides"] = len(slide_files)
        elif ext == ".docx":
            doc_files = [n for n in names if n == "word/document.xml" or re.fullmatch(r"word/(header|footer)\d+\.xml", n)]
            for name in doc_files:
                chunks.extend(xml_text(zf.read(name)))
                if sum(map(len, chunks)) >= 7000:
                    break
        elif ext == ".xlsx":
            if "xl/workbook.xml" in names:
                chunks.extend(xml_text(zf.read("xl/workbook.xml")))
            if "xl/sharedStrings.xml" in names:
                chunks.extend(xml_text(zf.read("xl/sharedStrings.xml")))
            sheet_files = sorted(n for n in names if re.fullmatch(r"xl/worksheets/sheet\d+\.xml", n, flags=re.I))
            for name in sheet_files[:6]:
                chunks.extend(xml_text(zf.read(name)))
                if sum(map(len, chunks)) >= 7000:
                    break
            meta["sheet_count"] = len(sheet_files)
        return unique(chunks), meta


def excerpt(text: str, stem: str) -> str:
    for part in re.split(r"[|。；;]", text):
        part = clean(part)
        if len(part) >= 4 and not re.fullmatch(r"[\d\W_]+", part):
            return part[:90]
    return stem[:90]


def update_description(record: dict, text: str, meta: dict) -> str:
    ext = record["extension"].lower()
    topic = record["topic"]
    stem = record["file_name"]
    item = excerpt(text, stem)
    if ext == ".pptx":
        return f"PPT演示文稿，共{meta.get('slides', '未知')}页；主要内容：{item}"
    if ext == ".docx":
        return f"Word文档；主要内容：{item}"
    if ext == ".xlsx":
        return f"Excel工作簿，共{meta.get('sheet_count', '未知')}个工作表；主要内容：{item}"
    return record["description"]


def main() -> None:
    payload = json.loads(INVENTORY.read_text(encoding="utf-8"))
    retried = 0
    recovered = 0
    missing = 0
    temporary = 0
    for record in payload["records"]:
        status = record["extraction"].get("status")
        if status not in {"error", "encrypted_or_protected", "skipped_large"}:
            continue
        retried += 1
        if record["full_name"].startswith("~$"):
            record["extraction"] = {"status": "temporary_lock_file"}
            record["description"] = "Office临时锁定文件；由对应工作文件打开时自动生成，不属于正式文档内容"
            temporary += 1
            continue
        path = ROOT / Path(record["relative_path"])
        if not path.exists():
            record["extraction"] = {"status": "missing_at_rescan"}
            record["description"] = f"目录快照中发现但补读时已不存在；根据文件名判断为{record['topic']}相关资料"
            missing += 1
            continue
        if path.suffix.lower() not in {".pptx", ".docx", ".xlsx"}:
            continue
        try:
            text, meta = raw_openxml(path)
            record["content_excerpt"] = text[:1000]
            record["extraction"] = meta
            record["description"] = update_description(record, text, meta)
            recovered += 1
        except Exception as exc:
            record["extraction"]["raw_retry_error"] = f"{type(exc).__name__}: {clean(str(exc))[:500]}"

    payload["retry_summary"] = {
        "retried": retried,
        "recovered": recovered,
        "temporary_lock_files": temporary,
        "missing_at_rescan": missing,
    }
    INVENTORY.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(payload["retry_summary"], ensure_ascii=False))


if __name__ == "__main__":
    main()

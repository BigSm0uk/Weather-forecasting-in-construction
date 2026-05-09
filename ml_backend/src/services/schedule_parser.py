import csv
import io
from datetime import datetime, date
from typing import List, Tuple

from schemas.schedule import ParsedTask


REQUIRED_COLUMNS = {"Task Name", "Work Type ID", "Start Date", "End Date"}

# Поддерживаемые форматы дат
DATE_FORMATS = ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%m/%d/%Y")


def _parse_date(value: str) -> date:
    value = value.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Не удалось распознать дату: '{value}'. "
                     f"Допустимые форматы: {', '.join(DATE_FORMATS)}")


def parse_csv(file_content: bytes) -> Tuple[List[ParsedTask], List[str]]:
    """
    Парсит CSV с колонками: Task Name, Work Type ID, Start Date, End Date.
    Возвращает (tasks, warnings).
    """
    warnings: List[str] = []

    # Декодирование с поддержкой UTF-8 BOM и cp1251 как fallback
    text: str
    try:
        text = file_content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = file_content.decode("cp1251")

    # Авто-определение разделителя
    sample = text[:2048]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel

    reader = csv.DictReader(io.StringIO(text), dialect=dialect)
    if not reader.fieldnames:
        raise ValueError("CSV пустой или не содержит заголовка")

    fieldnames = {fn.strip() for fn in reader.fieldnames}
    missing = REQUIRED_COLUMNS - fieldnames
    if missing:
        raise ValueError(
            f"В CSV отсутствуют колонки: {', '.join(sorted(missing))}. "
            f"Ожидаются: {', '.join(sorted(REQUIRED_COLUMNS))}"
        )

    # Карта колонок (с поправкой на пробелы)
    col_map = {fn.strip(): fn for fn in reader.fieldnames}

    tasks: List[ParsedTask] = []
    for idx, row in enumerate(reader, start=2):  # 2 — учитывая заголовок
        try:
            task_name = (row[col_map["Task Name"]] or "").strip()
            work_type_raw = (row[col_map["Work Type ID"]] or "").strip()
            start_raw = (row[col_map["Start Date"]] or "").strip()
            end_raw = (row[col_map["End Date"]] or "").strip()

            if not task_name:
                warnings.append(f"Строка {idx}: пустое название задачи — пропущена")
                continue
            if not work_type_raw:
                warnings.append(f"Строка {idx} ('{task_name}'): пустой Work Type ID — пропущена")
                continue

            try:
                work_id = int(work_type_raw)
            except ValueError:
                warnings.append(
                    f"Строка {idx} ('{task_name}'): Work Type ID должен быть числом, получено '{work_type_raw}' — пропущена"
                )
                continue

            start_date = _parse_date(start_raw)
            end_date = _parse_date(end_raw)

            if end_date < start_date:
                warnings.append(
                    f"Строка {idx} ('{task_name}'): End Date < Start Date — пропущена"
                )
                continue

            tasks.append(ParsedTask(
                task_name=task_name,
                work_id=work_id,
                start_date=start_date,
                end_date=end_date,
            ))
        except Exception as e:
            warnings.append(f"Строка {idx}: ошибка парсинга — {e}")

    if not tasks:
        raise ValueError("Не удалось извлечь ни одной задачи из CSV")

    return tasks, warnings

import json
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


PAGE_WIDTH, PAGE_HEIGHT = landscape(letter)
MARGIN = 36
MAX_IMAGES_PER_PAGE = 2


def draw_wrapped_text(pdf, text, x, y, width, font_name="Helvetica", font_size=10, leading=14, color=colors.black):
    pdf.setFont(font_name, font_size)
    pdf.setFillColor(color)
    words = text.split()
    lines = []
    current = []
    for word in words:
        trial = " ".join(current + [word])
        if pdf.stringWidth(trial, font_name, font_size) <= width:
            current.append(word)
        else:
            if current:
                lines.append(" ".join(current))
            current = [word]
    if current:
        lines.append(" ".join(current))

    cursor = y
    for line in lines:
        pdf.drawString(x, cursor, line)
        cursor -= leading
    return cursor


def draw_image_fit(pdf, image_path, x, y, width, height):
    image = ImageReader(str(image_path))
    image_width, image_height = image.getSize()
    scale = min(width / image_width, height / image_height)
    draw_width = image_width * scale
    draw_height = image_height * scale
    draw_x = x + (width - draw_width) / 2
    draw_y = y + (height - draw_height) / 2
    pdf.drawImage(image, draw_x, draw_y, draw_width, draw_height, preserveAspectRatio=True, mask="auto")


def draw_title_page(pdf, payload):
    summary = payload["summary"]
    findings = summary["findings"]
    viewport_summary = ", ".join(
        [f"{item['viewport']}:{item['routeCount']}@{item['themeId']}" for item in findings["viewportResults"]]
    )
    pdf.setFillColor(colors.HexColor("#151317"))
    pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

    pdf.setFillColor(colors.HexColor("#F4ECED"))
    pdf.setFont("Helvetica-Bold", 24)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 64, "Couple Book owner UI review")

    pdf.setFont("Helvetica", 12)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 92, payload["reviewDateLabel"])
    pdf.drawString(MARGIN, PAGE_HEIGHT - 112, f"Verdict: {summary['verdict']}")
    pdf.drawString(MARGIN, PAGE_HEIGHT - 132, f"Preview channel: {summary['previewUrl']}")
    pdf.drawString(MARGIN, PAGE_HEIGHT - 152, f"Local review app: {summary['localBaseUrl']}")

    bullets = [
        f"Defects found: {len(findings['defectsFound'])}",
        f"Defects fixed: {len(findings['defectsFixed'])}",
        f"Unresolved defects: {len(findings['unresolvedDefects'])}",
        f"Buttons tested: {findings['buttonsTested']}",
        f"Cards inspected: {findings['cardsInspected']}",
        f"Themes proven: {', '.join(findings['themesProven'])}",
        f"Viewport results: {viewport_summary}",
    ]

    cursor = PAGE_HEIGHT - 196
    for bullet in bullets:
        cursor = draw_wrapped_text(
            pdf,
            f"- {bullet}",
            MARGIN,
            cursor,
            PAGE_WIDTH - (MARGIN * 2),
            font_name="Helvetica",
            font_size=12,
            leading=18,
            color=colors.HexColor("#D7CCD1"),
        ) - 2

    pdf.setFont("Helvetica-Oblique", 10)
    pdf.setFillColor(colors.HexColor("#BDAEB4"))
    pdf.drawString(MARGIN, 28, f"PDF artifact: {payload['pdfPath']}")
    pdf.showPage()


def draw_findings_page(pdf, summary):
    findings = summary["findings"]
    pdf.setFillColor(colors.white)
    pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

    pdf.setFillColor(colors.HexColor("#221822"))
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 42, "Explicit findings")

    cursor = PAGE_HEIGHT - 74
    sections = [
        ("Defects found", findings["defectsFound"]),
        ("Defects fixed", findings["defectsFixed"]),
        ("Unresolved defects", findings["unresolvedDefects"]),
    ]
    for title, items in sections:
        pdf.setFont("Helvetica-Bold", 13)
        pdf.drawString(MARGIN, cursor, title)
        cursor -= 20
        if not items:
            cursor = draw_wrapped_text(pdf, "- None", MARGIN + 10, cursor, PAGE_WIDTH - (MARGIN * 2) - 10, font_size=11, leading=15, color=colors.HexColor("#5A4A53")) - 4
        else:
            for item in items:
                cursor = draw_wrapped_text(pdf, f"- {item}", MARGIN + 10, cursor, PAGE_WIDTH - (MARGIN * 2) - 10, font_size=11, leading=15, color=colors.HexColor("#5A4A53")) - 4
        cursor -= 10
    pdf.showPage()


def chunked(items, size):
    for index in range(0, len(items), size):
        yield items[index:index + size]


def draw_image_section(pdf, section):
    images = section.get("images", [])
    if not images:
        return

    for group in chunked(images, MAX_IMAGES_PER_PAGE):
        pdf.setFillColor(colors.white)
        pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
        pdf.setFillColor(colors.HexColor("#221822"))
        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawString(MARGIN, PAGE_HEIGHT - 42, section["title"])
        pdf.setFont("Helvetica", 11)
        pdf.setFillColor(colors.HexColor("#5A4A53"))
        pdf.drawString(MARGIN, PAGE_HEIGHT - 60, section.get("subtitle", ""))

        usable_top = PAGE_HEIGHT - 90
        usable_height = usable_top - MARGIN
        image_block_height = (usable_height - 20) / len(group)

        for index, image in enumerate(group):
            x = MARGIN
            y = usable_top - ((index + 1) * image_block_height) - (index * 20)
            frame_height = image_block_height - 8

            pdf.setStrokeColor(colors.HexColor("#D0C1C7"))
            pdf.roundRect(x, y, PAGE_WIDTH - (MARGIN * 2), frame_height, 6, stroke=1, fill=0)

            caption_height = 38
            draw_image_fit(pdf, Path(image["path"]), x + 8, y + caption_height, PAGE_WIDTH - (MARGIN * 2) - 16, frame_height - caption_height - 10)
            draw_wrapped_text(
                pdf,
                image["caption"],
                x + 10,
                y + 24,
                PAGE_WIDTH - (MARGIN * 2) - 20,
                font_name="Helvetica",
                font_size=9,
                leading=11,
                color=colors.HexColor("#221822"),
            )

        pdf.showPage()


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: build-owner-ui-review-pdf.py <payload.json>")

    payload_path = Path(sys.argv[1])
    payload = json.loads(payload_path.read_text(encoding="utf-8"))
    output_path = Path(payload["pdfPath"])
    output_path.parent.mkdir(parents=True, exist_ok=True)

    pdf = canvas.Canvas(str(output_path), pagesize=landscape(letter))
    pdf.setTitle("Couple Book owner UI review")
    draw_title_page(pdf, payload)
    draw_findings_page(pdf, payload["summary"])
    for section in payload["summary"].get("pdfSections", []):
        draw_image_section(pdf, section)
    pdf.save()


if __name__ == "__main__":
    main()

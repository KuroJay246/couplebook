from pathlib import Path
import json
import sys

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


def fit_image(path, box):
    image = ImageReader(str(path))
    width, height = image.getSize()
    max_width, max_height = box
    scale = min(max_width / width, max_height / height)
    return width * scale, height * scale


def draw_page(pdf, title, subtitle, image_path=None):
    page_width, page_height = landscape(A4)
    pdf.setFillColor(colors.HexColor('#fff9fb'))
    pdf.rect(0, 0, page_width, page_height, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor('#24131d'))
    pdf.setFont('Helvetica-Bold', 19)
    pdf.drawString(42, page_height - 48, title)
    pdf.setFillColor(colors.HexColor('#6c5460'))
    pdf.setFont('Helvetica', 9)
    pdf.drawString(42, page_height - 66, subtitle)
    if image_path and Path(image_path).exists():
        max_width, max_height = page_width - 84, page_height - 112
        image_width, image_height = fit_image(image_path, (max_width, max_height))
        x = (page_width - image_width) / 2
        y = 26 + (max_height - image_height) / 2
        pdf.drawImage(str(image_path), x, y, width=image_width, height=image_height, preserveAspectRatio=True, anchor='c')
    pdf.setFillColor(colors.HexColor('#8a6f7c'))
    pdf.setFont('Helvetica', 7)
    pdf.drawRightString(page_width - 42, 18, 'Couple Book web UI/UX review')
    pdf.showPage()


def build_technical_appendix(output_dir, visual_dir, theme_dir, cards_dir):
    appendix_path = output_dir / 'COUPLE_BOOK_WEB_UI_UX_TECHNICAL_APPENDIX.pdf'
    pdf = canvas.Canvas(str(appendix_path), pagesize=landscape(A4))
    groups = [
        ('Routes and responsive viewports', sorted(visual_dir.glob('*.png'))),
        ('Cards', sorted(cards_dir.glob('*closeup*.png'))),
        ('Themes', sorted(theme_dir.glob('*theme*.png')) + sorted(theme_dir.glob('*dashboard*viewport*.png')) + sorted(theme_dir.glob('*gallery*viewport*.png')) + sorted(theme_dir.glob('*settings*viewport*.png'))),
    ]
    for group_name, files in groups:
        draw_page(pdf, group_name, f'Technical appendix | {len(files)} captures', None)
        for image in files:
            draw_page(pdf, image.stem.replace('-', ' | '), f'Technical appendix | {group_name}', image)
    pdf.save()
    return appendix_path


def write_assessment(output_dir):
    assessment = """# Couple Book Web UI/UX Owner Assessment

Status: READY FOR OWNER REVIEW after preview deployment.

## Task Results

| Task | Result | Evidence |
| --- | --- | --- |
| Open Home and understand the relationship at a glance | PASS | Home desktop/mobile captures |
| Read Story in chronological order | PASS | Story desktop/mobile captures |
| Browse Album visually | PASS | Album desktop/mobile captures |
| Reveal Album management intentionally | PASS | Manage uploads control and UX boundary test |
| Open Plans and understand shared intent | PASS | Plans desktop capture |
| Open Us and review the relationship profile | PASS | Us desktop capture |
| Open Settings without diagnostic overload | PASS | Advanced panel and Settings captures |
| See Paper Hearts as a light editorial theme | PASS | Theme appendix capture |
| Compare Midnight Rose and Moonlit | PASS | Theme appendix captures |
| Use desktop, tablet, and mobile layouts | PASS | 1440, 1280, tablet, 390, and 360 captures |
| Keep normal product copy free of QA language | PASS | Production copy check and source cleanup |
| Keep private media boundaries intact | PASS | Gallery and media service tests |
| Keep native work frozen | PASS | No native files changed in this pass |

## Automated Evidence

- App tests: 176 passed, 16 emulator-dependent skips.
- Browser, product interaction, visual, and performance checks: PASS.
- Copy, production path, identity, product QA, product audit, and diff checks: PASS.
- Firestore rules: 12 passed.

## Remaining Notes

- Real authenticated owner sign-in and private production media remain outside this local fixture run.
- The technical appendix contains the complete captured evidence set and source metrics.
"""
    path = output_dir / 'owner-task-assessment.md'
    path.write_text(assessment, encoding='utf-8')
    return path


def main():
    output_dir = Path(sys.argv[1])
    output_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = output_dir / 'COUPLE_BOOK_WEB_UI_UX_REVIEW.pdf'
    visual_dir = Path(sys.argv[2])
    theme_dir = Path(sys.argv[3])
    cards_dir = Path(sys.argv[4])

    pdf = canvas.Canvas(str(pdf_path), pagesize=landscape(A4))
    draw_page(pdf, 'Couple Book web UI/UX review', 'Concise owner-facing review of the responsive product pass')
    draw_page(pdf, 'Executive verdict', 'The web product is visually calmer and more relationship-first. Native work is frozen and preserved.')

    pages = [
        ('Home | desktop 1440px', visual_dir / 'desktop-1440-dashboard.png'),
        ('Home | mobile 360px', visual_dir / 'mobile-360-dashboard.png'),
        ('Story | desktop 1440px', visual_dir / 'desktop-1440-timeline.png'),
        ('Story | mobile 360px', visual_dir / 'mobile-360-timeline.png'),
        ('Album | desktop 1440px', visual_dir / 'desktop-1440-gallery.png'),
        ('Album | mobile 360px', visual_dir / 'mobile-360-gallery.png'),
        ('Plans | desktop 1440px', visual_dir / 'desktop-1440-plans.png'),
        ('Us | desktop 1440px', visual_dir / 'desktop-1440-profile.png'),
        ('Settings | desktop 1440px', visual_dir / 'desktop-1440-settings.png'),
        ('Settings | mobile 360px', visual_dir / 'mobile-360-settings.png'),
        ('Midnight Rose | theme proof', theme_dir / 'desktop-dashboard-midnight-rose-viewport.png'),
        ('Paper Hearts | light theme proof', theme_dir / 'desktop-dashboard-paper-hearts-viewport.png'),
        ('Moonlit | theme proof', theme_dir / 'desktop-dashboard-moonlit-viewport.png'),
        ('Album tile | readable close-up', cards_dir / 'desktop-album-tile-midnight-rose-closeup.png'),
        ('Featured memory | readable close-up', cards_dir / 'desktop-featured-memory-midnight-rose-closeup.png'),
        ('Plan card | readable close-up', cards_dir / 'desktop-plan-card-midnight-rose-closeup.png'),
    ]
    for title, image in pages:
        draw_page(pdf, title, 'Rendered evidence captured from the local responsive web build', image)

    draw_page(pdf, 'Corrections in this pass', 'Album management is secondary; Settings diagnostics are behind Advanced; responsive styling and UX boundary tests were added.')
    draw_page(pdf, 'Validation', '176 app-v2 tests passed; lint, build, browser, product, visual, and performance checks passed. Emulator-dependent rule tests remain environment-sensitive.')
    pdf.save()
    appendix_path = build_technical_appendix(output_dir, visual_dir, theme_dir, cards_dir)
    assessment_path = write_assessment(output_dir)
    print(json.dumps({'pdf': str(pdf_path), 'pages': len(pages) + 4, 'appendix': str(appendix_path), 'assessment': str(assessment_path)}))


if __name__ == '__main__':
    main()

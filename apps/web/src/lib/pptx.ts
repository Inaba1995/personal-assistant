import type { Slide } from '@assistant/shared';
import { downloadFile } from '../api/client';

/**
 * Экспорт презентации в .pptx (pptxgenjs, генерация в браузере).
 */
export async function exportPptx(title: string, slides: Slide[]): Promise<void> {
  const { default: PptxGenJS } = await import('pptxgenjs');

  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_16x9';
  pres.title = title;
  pres.author = 'Персональный ассистент';

  const list = slides.length > 0 ? slides : [{ title, bullets: ['Пустая презентация'] }];

  for (const item of list) {
    const slide = pres.addSlide();
    slide.background = { color: 'FFFFFF' };

    slide.addText(item.title, {
      x: 0.5,
      y: 0.4,
      w: 9,
      h: 1.1,
      fontSize: 28,
      bold: true,
      color: '1F2937',
    });

    if (item.bullets.length > 0) {
      slide.addText(
        item.bullets.map((bullet) => ({ text: bullet, options: { bullet: true, breakLine: true } })),
        {
          x: 0.7,
          y: 1.7,
          w: 8.6,
          h: 3.3,
          fontSize: 16,
          color: '374151',
          valign: 'top',
        },
      );
    }
  }

  const safeName = title.replace(/[\\/:*?"<>|]/g, '_') || 'presentation';
  // writeFile запускает скачивание файла в браузере.
  await pres.writeFile({ fileName: `${safeName}.pptx` });
}

/** Скачивание произвольного содержимого как файла (используется для JSON-бэкапа). */
export function downloadJson(filename: string, data: unknown): void {
  downloadFile(filename, JSON.stringify(data, null, 2), 'application/json');
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { PixelArt } from '../../games/marquees';

interface Run {
  x: number;
  y: number;
  width: number;
  color: string;
}

/** Draws pixel art as crisp SVG, one rectangle per run of equal pixels. */
@Component({
  selector: 'app-teaser-marquee',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
      shape-rendering="crispEdges"
      aria-hidden="true"
    >
      <rect [attr.width]="width()" [attr.height]="height()" [attr.fill]="art().background" />
      @for (run of runs(); track $index) {
        <rect
          [attr.x]="run.x"
          [attr.y]="run.y"
          [attr.width]="run.width"
          height="1"
          [attr.fill]="run.color"
        />
      }
    </svg>
  `,
  host: { class: 'teaser-marquee' },
})
export class TeaserMarqueeComponent {
  readonly art = input.required<PixelArt>();

  protected readonly width = computed(() => this.art().rows[0]?.length ?? 0);
  protected readonly height = computed(() => this.art().rows.length);
  protected readonly runs = computed(() => {
    const { rows, palette } = this.art();
    const runs: Run[] = [];
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length;) {
        const char = row[x];
        let end = x + 1;
        while (row[end] === char) end++;
        const color = palette[char];
        if (color) runs.push({ x, y, width: end - x, color });
        x = end;
      }
    });
    return runs;
  });
}

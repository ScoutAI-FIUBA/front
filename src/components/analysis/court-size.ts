interface CourtDimensions {
  lengthM: number
  widthM: number
}

// Vertical space reserved for the page header, tabs/controls above the court
// and the legend/caption below it. Keeps the whole court visible on ~940px tall viewports.
const RESERVED_VIEWPORT_HEIGHT = '17rem'
const MIN_COURT_WIDTH = '22rem'

function courtMaxWidth(court: CourtDimensions): string {
  return `max(${MIN_COURT_WIDTH}, calc((100dvh - ${RESERVED_VIEWPORT_HEIGHT}) * ${court.lengthM} / ${court.widthM}))`
}

// Frame of the court drawing: full available width, capped so the height fits the viewport.
export function courtFrameStyle(court: CourtDimensions) {
  return {
    aspectRatio: `${court.lengthM} / ${court.widthM}`,
    width: '100%',
    maxWidth: courtMaxWidth(court),
    marginInline: 'auto',
  }
}

// Column holding the court and its legend/caption, so they stay aligned with the court width.
export function courtColumnStyle(court: CourtDimensions) {
  return {
    width: '100%',
    maxWidth: courtMaxWidth(court),
    marginInline: 'auto',
  }
}

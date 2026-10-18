import {
  basketballCourtLineGeometry,
  type BasketballCourtLineDimensions,
} from './basketball-court-lines'

type BasketballCourtLinesProps = BasketballCourtLineDimensions

export function BasketballCourtLines({
  lengthM,
  widthM,
  hoopInsetM,
  threePointRadiusM,
  cornerThreeLateralM,
}: BasketballCourtLinesProps) {
  const geometry = basketballCourtLineGeometry({
    lengthM,
    widthM,
    hoopInsetM,
    threePointRadiusM,
    cornerThreeLateralM,
  })
  const {
    centreY,
    topCornerY,
    bottomCornerY,
    leftArcX,
    rightArcX,
  } = geometry
  const paintWidth = widthM * (4.9 / 15)
  const paintDepth = lengthM * (5.8 / 28)
  const paintY = centreY - paintWidth / 2
  const centreCircleRadius = Math.min(lengthM, widthM) * 0.12
  const freeThrowRadius = Math.min(lengthM, widthM) * 0.12

  return (
    <g fill="none" stroke="currentColor" className="text-white/80">
      <rect x="0.08" y="0.08" width={Math.max(0, lengthM - 0.16)} height={Math.max(0, widthM - 0.16)} strokeWidth="0.12" />
      <line x1={lengthM / 2} y1="0" x2={lengthM / 2} y2={widthM} strokeWidth="0.1" />
      <circle cx={lengthM / 2} cy={centreY} r={centreCircleRadius} strokeWidth="0.1" />

      <rect x="0" y={paintY} width={paintDepth} height={paintWidth} strokeWidth="0.1" />
      <rect x={lengthM - paintDepth} y={paintY} width={paintDepth} height={paintWidth} strokeWidth="0.1" />
      <circle cx={paintDepth} cy={centreY} r={freeThrowRadius} strokeWidth="0.08" strokeDasharray="0.28 0.2" />
      <circle cx={lengthM - paintDepth} cy={centreY} r={freeThrowRadius} strokeWidth="0.08" strokeDasharray="0.28 0.2" />

      <line x1="0" y1={topCornerY} x2={leftArcX} y2={topCornerY} strokeWidth="0.1" />
      <path d={`M ${leftArcX} ${topCornerY} A ${geometry.threePointRadiusM} ${geometry.threePointRadiusM} 0 0 1 ${leftArcX} ${bottomCornerY}`} strokeWidth="0.1" />
      <line x1={leftArcX} y1={bottomCornerY} x2="0" y2={bottomCornerY} strokeWidth="0.1" />

      <line x1={lengthM} y1={topCornerY} x2={rightArcX} y2={topCornerY} strokeWidth="0.1" />
      <path d={`M ${rightArcX} ${topCornerY} A ${geometry.threePointRadiusM} ${geometry.threePointRadiusM} 0 0 0 ${rightArcX} ${bottomCornerY}`} strokeWidth="0.1" />
      <line x1={rightArcX} y1={bottomCornerY} x2={lengthM} y2={bottomCornerY} strokeWidth="0.1" />

      <line x1={geometry.hoopInsetM - 0.15} y1={centreY - 0.9} x2={geometry.hoopInsetM - 0.15} y2={centreY + 0.9} strokeWidth="0.12" />
      <line x1={lengthM - geometry.hoopInsetM + 0.15} y1={centreY - 0.9} x2={lengthM - geometry.hoopInsetM + 0.15} y2={centreY + 0.9} strokeWidth="0.12" />
      <circle cx={geometry.hoopInsetM} cy={centreY} r="0.23" strokeWidth="0.12" className="text-white" />
      <circle cx={lengthM - geometry.hoopInsetM} cy={centreY} r="0.23" strokeWidth="0.12" className="text-white" />
    </g>
  )
}

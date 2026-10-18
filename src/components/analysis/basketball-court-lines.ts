export interface BasketballCourtLineDimensions {
  lengthM: number
  widthM: number
  hoopInsetM?: number
  threePointRadiusM?: number
  /** Lateral distance from the court width centre line, matching the backend contract. */
  cornerThreeLateralM?: number
}

export interface BasketballCourtLineGeometry {
  centreY: number
  hoopInsetM: number
  threePointRadiusM: number
  cornerThreeLateralM: number
  topCornerY: number
  bottomCornerY: number
  leftArcX: number
  rightArcX: number
}

export function basketballCourtLineGeometry({
  lengthM,
  widthM,
  hoopInsetM = lengthM * (1.575 / 28),
  threePointRadiusM = lengthM * (6.75 / 28),
  cornerThreeLateralM = widthM * (6.6 / 15),
}: BasketballCourtLineDimensions): BasketballCourtLineGeometry {
  const centreY = widthM / 2
  const topCornerY = centreY - cornerThreeLateralM
  const bottomCornerY = centreY + cornerThreeLateralM
  const arcDeltaX = Math.sqrt(Math.max(0, threePointRadiusM ** 2 - cornerThreeLateralM ** 2))

  return {
    centreY,
    hoopInsetM,
    threePointRadiusM,
    cornerThreeLateralM,
    topCornerY,
    bottomCornerY,
    leftArcX: hoopInsetM + arcDeltaX,
    rightArcX: lengthM - hoopInsetM - arcDeltaX,
  }
}

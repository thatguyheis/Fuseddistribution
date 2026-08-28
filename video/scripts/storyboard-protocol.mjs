export function validateStoryboardProtocol(plan) {
  const errors = [];
  const segments = plan?.segments ?? [];
  const visuals = new Set(segments.map((segment) => segment.visual));
  const dataBoards = segments.filter((segment) => segment.visual === 'data-board');

  if (plan?.route !== 'storyboard-pilot') errors.push('route must be storyboard-pilot');
  if (segments.length < 6) errors.push('a storyboard reel must contain at least six planned segments');
  if (visuals.size < 4) errors.push('a storyboard reel must use at least four visual roles');
  if (!visuals.has('paper-collage')) errors.push('a storyboard reel must include at least one paper-collage beat');
  if (dataBoards.length < 3) errors.push('a storyboard reel must include at least three data or process boards');
  if (!visuals.has('standard-card')) errors.push('a storyboard reel must retain at least one standard production card');

  for (const segment of segments) {
    if (segment.visual === 'paper-collage' && (!segment.label || !segment.message)) {
      errors.push(`segment ${segment.segmentIndex}: paper collage requires a label and message`);
    }
    if (segment.visual !== 'data-board') continue;
    const board = segment.dataBoard;
    if (!board) {
      errors.push(`segment ${segment.segmentIndex}: data-board is missing dataBoard configuration`);
      continue;
    }
    for (const field of ['title', 'subtitle', 'takeaway', 'sourceNote', 'sourcePeriod']) {
      if (!board[field]?.trim()) errors.push(`segment ${segment.segmentIndex}: data board requires ${field}`);
    }
    if (['line', 'bars', 'donut'].includes(board.chartType)) {
      if (!board.axisLabel?.trim()) errors.push(`segment ${segment.segmentIndex}: ${board.chartType} requires an axisLabel`);
      if (!board.unit?.trim()) errors.push(`segment ${segment.segmentIndex}: ${board.chartType} requires a unit`);
      if (!Array.isArray(board.labels) || !Array.isArray(board.values) || board.labels.length !== board.values.length || board.labels.length < 2) {
        errors.push(`segment ${segment.segmentIndex}: chart labels and values must be paired with at least two points`);
      }
      if (board.labels?.length > 8) errors.push(`segment ${segment.segmentIndex}: chart has too many labels for portrait viewing`);
      if (board.values?.some((value) => typeof value !== 'number' || !Number.isFinite(value))) errors.push(`segment ${segment.segmentIndex}: chart values must be finite numbers`);
    }
    if (['line', 'bars'].includes(board.chartType)) {
      if (!board.xAxisLabel?.trim()) errors.push(`segment ${segment.segmentIndex}: ${board.chartType} requires an xAxisLabel`);
      if (!board.yAxisLabel?.trim()) errors.push(`segment ${segment.segmentIndex}: ${board.chartType} requires a yAxisLabel`);
    }
    if (board.chartType === 'process' && (!Array.isArray(board.steps) || board.steps.length < 3)) errors.push(`segment ${segment.segmentIndex}: process board requires at least three steps`);
  }

  for (let index = 1; index < segments.length; index += 1) {
    if (segments[index].visual === 'standard-card' && segments[index - 1].visual === 'standard-card') errors.push(`segments ${index - 1}-${index}: generic standard cards cannot appear consecutively in the storyboard pilot`);
  }
  if (errors.length) throw new Error(`Storyboard protocol failed:\n- ${errors.join('\n- ')}`);
  return plan;
}

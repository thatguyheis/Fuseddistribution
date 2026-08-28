import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateStoryboardProtocol } from './storyboard-protocol.mjs';

const videoDir = join(import.meta.dirname, '..');
const slug = process.argv.find((value) => value.startsWith('--post='))?.replace('--post=', '') ?? 'silver-price-history-and-long-term-trends';
const propsPath = join(videoDir, 'out', slug, 'render-props.json');
const outputPath = join(videoDir, 'out', slug, 'storyboard.json');
if (!existsSync(propsPath)) throw new Error(`Missing render props: ${propsPath}`);
const props = JSON.parse(readFileSync(propsPath, 'utf8'));
const visualByIndex = [
  ['opening', 'paper-collage', 'paper-collage-pilot/source-still.png', '#315c62', '#d8b84c', 'VALUE BELOW HISTORY', 'BELOW THE MEDIAN'],
  ['historical context', 'paper-collage', 'paper-collage-pilot/timeline.png', '#d86b3f', '#d8b84c', 'HISTORY MOVES', 'HISTORICAL RANGE'],
  ['industrial demand', 'paper-collage', 'paper-collage-pilot/solar-demand.png', '#c89f2d', '#315c62', 'INDUSTRIAL DEMAND', 'DEMAND PRESSURE'],
  ['relative value', 'paper-collage', 'paper-collage-pilot/ratio-balance.png', '#4b285f', '#d8b84c', 'RELATIVE VALUE', 'GOLD VS SILVER'],
];
const paperByIndex = new Map([[0, visualByIndex[0]], [5, visualByIndex[1]]]);
const dataBoardByIndex = new Map([
  [1, { chartType: 'line', title: 'THE PRICE DID NOT MOVE IN A STRAIGHT LINE', subtitle: 'A long view makes the peaks, resets, and current range visible at a glance.', labels: ['1800s', '1973', '1980', '2000', '2011', 'now'], values: [1.29, 2, 49.45, 5, 48.7, 25], unit: '$', axisLabel: 'USD PER TROY OUNCE', xAxisLabel: 'YEAR OR PERIOD', yAxisLabel: 'PRICE (USD PER TROY OUNCE)', takeaway: 'History is a range, not a single price.', sourceNote: 'HISTORICAL PRICE RANGE', sourcePeriod: '1800s to present' }],
  [2, { chartType: 'bars', title: '1973: UNDER $2  →  JAN 1980: $49.45', subtitle: 'The Hunt brothers’ accumulation period took silver from a low base to its nominal peak.', labels: ['1973 base', '1980 peak'], values: [2, 49.45], unit: '$', axisLabel: 'USD PER TROY OUNCE', xAxisLabel: 'REFERENCE PERIOD', yAxisLabel: 'PRICE (USD PER TROY OUNCE)', takeaway: 'The 1980 peak was about 24.7× the 1973 base.', sourceNote: 'HUNT BROTHERS ERA • HISTORICAL PRICE', sourcePeriod: '1973 to January 1980' }],
  [3, { chartType: 'bars', title: 'INDUSTRIAL DEMAND IS THE PRESSURE POINT', subtitle: 'Solar demand rose from 50 million ounces in 2014 to about 232 million in 2024, alongside a 182 million ounce deficit.', labels: ['solar 2014', 'solar 2024', 'deficit 2024'], values: [50, 232, 182], unit: 'M', axisLabel: 'MILLION TROY OUNCES', xAxisLabel: 'CATEGORY', yAxisLabel: 'VOLUME (MILLION TROY OUNCES)', takeaway: 'Demand growth and deficit belong in the same frame.', sourceNote: 'DEMAND / SUPPLY SNAPSHOT', sourcePeriod: '2014 and 2024' }],
  [4, { chartType: 'line', title: 'THE RATIO IS A SWITCHING SIGNAL', subtitle: 'Above 80, silver is presented as cheap relative to gold in this editorial example.', labels: ['2015', '2018', '2020', '2022', 'now'], values: [55, 70, 125, 75, 85], unit: 'x', axisLabel: 'OUNCES OF SILVER PER OUNCE OF GOLD', xAxisLabel: 'YEAR OR PERIOD', yAxisLabel: 'RATIO (OUNCES OF SILVER)', threshold: 80, takeaway: 'The 80x line is the decision boundary.', sourceNote: 'GOLD / SILVER RATIO', sourcePeriod: '2015 to present' }],
  [6, { chartType: 'donut', title: 'MOST DAYS FEEL LIKE NOTHING IS HAPPENING', subtitle: 'The narration gives the audience a useful contrast: the biggest gains cluster in a small share of trading days.', labels: ['biggest gains', 'other days'], values: [20, 80], unit: '%', axisLabel: 'SHARE OF TRADING DAYS', takeaway: 'A boring month does not automatically mean a broken plan.', sourceNote: 'TRADING-DAY RHYTHM', sourcePeriod: 'general historical pattern' }],
  [8, { chartType: 'process', title: 'TURN THE DATA INTO A ROUTINE', subtitle: 'The closing visual should make the next action obvious instead of ending on another generic photo.', steps: ['Pull the 50-year FRED series', 'Mark the real-dollar buy zone', 'Check the ratio every Friday'], axisLabel: 'THREE REPEATABLE ACTIONS', takeaway: 'Use the chart to create a habit, not a prediction.', sourceNote: 'RESEARCH WORKFLOW', sourcePeriod: 'current production action' }],
]);
const dataBoardStyleByIndex = new Map([
  [1, visualByIndex[1]], [2, visualByIndex[2]], [3, visualByIndex[2]], [4, visualByIndex[3]], [6, visualByIndex[1]], [8, visualByIndex[3]],
]);
const segments = props.script.segments.map((segment, segmentIndex) => {
  const paper = paperByIndex.get(segmentIndex);
  const dataBoard = dataBoardByIndex.get(segmentIndex);
  const visual = dataBoard ? 'data-board' : paper ? paper[1] : segment.type === 'chart' ? 'chart' : segment.type === 'question' ? 'question' : 'standard-card';
  return {
    segmentIndex,
    chapter: paper?.[0] ?? (segment.type === 'question' ? 'closing question' : 'evidence and action'),
    purpose: segment.narration ?? segment.text ?? segment.title,
    visual,
    ...(dataBoard ? { dataBoard } : {}),
    ...(paper ? { asset: paper[2], backgroundColor: paper[3], accentColor: paper[4], label: paper[5], message: paper[6] } : dataBoardStyleByIndex.has(segmentIndex) ? { asset: dataBoardStyleByIndex.get(segmentIndex)[2], backgroundColor: dataBoardStyleByIndex.get(segmentIndex)[3], accentColor: dataBoardStyleByIndex.get(segmentIndex)[4] } : {}),
    assemblyOrder: paper ? ['paper field', 'primary subject', 'meaning marker', 'supporting object'] : ['existing production card', 'approved media', 'caption layer'],
    transitionIntent: paper ? 'snap from evidence into a tactile analogy, then hold' : 'preserve the existing production transition rhythm',
  };
});
const plan = validateStoryboardProtocol({
  route: 'storyboard-pilot',
  planner: 'local-deterministic',
  fixture: slug,
  narrativeArc: ['frame the question', 'establish historical context', 'show demand pressure', 'compare relative value', 'move from evidence to action', 'close with a question'],
  segments,
});
writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`);
console.log(`✓ Storyboard plan written: ${outputPath}`);

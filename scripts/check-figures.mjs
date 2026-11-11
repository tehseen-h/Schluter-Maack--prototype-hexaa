// Prints every worked-out figure so they can be read and recomputed by hand:
//   node --experimental-strip-types --no-warnings scripts/check-figures.mjs
import * as f from '../src/content/figures.ts'

const row = (r) =>
  `${r.no} ${r.date} ${r.grade.padEnd(12)} gross ${r.gross} tare ${r.tare} net ${r.net} dock ${r.dockagePct}% = ${r.dockageKg} netClean ${r.netClean} printed ${r.printedNetClean}`
console.log('MAIN', f.MAIN)
f.mainLoads.forEach((r, i) => console.log(row(r), '| running', f.running[i]))
console.log({ total: f.mainTotalKg, max: f.MAIN.maxKg, over: f.overKg, l4Inside: f.l4Inside, l4Over: f.l4Over, navGapDollars: f.navGapDollars })
f.mainSettlement.forEach((s) => console.log(s.id, s.state, s.working, s.amount))
console.log({ ready: f.readyTotal, held: f.heldTotal, prepared: f.preparedTotal })
console.log('CLEAN', f.CLEAN.minKg, f.CLEAN.maxKg, f.cleanTotalKg, f.cleanLb, f.cleanTotal)
f.cleanLoads.forEach((r) => console.log(row(r)))
f.blockedLoads.forEach((r) => console.log(row(r)))
f.sheet.forEach((s) => console.log(s.c.no, s.c.qtyKg, s.deliveredKg, s.state))
const dates = [f.MAIN.signed, f.MAIN.periodFrom, f.MAIN.periodTo, ...f.mainLoads.map((r) => r.date), ...f.cleanLoads.map((r) => r.date), ...f.blockedLoads.map((r) => r.date)]
console.log(dates.map((d) => `${d}=${f.dayShort(d)}`).join('  '))

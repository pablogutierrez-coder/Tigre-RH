import assert from 'node:assert/strict';
import { calculateTrainingVariableEvaluation } from './trainingVariableCalculator.js';

const baseInput = {
  porcentaje_retencion: 40,
  porcentaje_produccion_individual: 75,
  porcentaje_produccion_grupal: 100,
  porcentaje_satisfaccion: 90,
  porcentaje_administrativo: 100,
  observacion_administrativa: '',
};

const calc = (overrides: Partial<typeof baseInput>) =>
  calculateTrainingVariableEvaluation({ ...baseInput, ...overrides });

assert.equal(calc({ porcentaje_retencion: 40 }).cumplimiento_retencion, 100);
assert.equal(calc({ porcentaje_retencion: 40 }).aporte_retencion, 40);
assert.equal(calc({ porcentaje_retencion: 50 }).cumplimiento_retencion, 125);
assert.equal(calc({ porcentaje_retencion: 50 }).aporte_retencion, 50);
assert.equal(calc({ porcentaje_retencion: 30 }).cumplimiento_retencion, 75);
assert.equal(calc({ porcentaje_retencion: 30 }).aporte_retencion, 30);

assert.equal(calc({ porcentaje_produccion_grupal: 80 }).aporte_produccion, 32);
assert.equal(calc({ porcentaje_produccion_grupal: 100 }).aporte_produccion, 40);
assert.equal(calc({ porcentaje_produccion_grupal: 112.5 }).aporte_produccion, 45);
assert.equal(
  calc({ porcentaje_produccion_individual: 0, porcentaje_produccion_grupal: 100 }).comision_total,
  calc({ porcentaje_produccion_individual: 100, porcentaje_produccion_grupal: 100 }).comision_total,
);

assert.equal(calc({ porcentaje_satisfaccion: 81 }).cumplimiento_satisfaccion, 90);
assert.equal(calc({ porcentaje_satisfaccion: 81 }).aporte_satisfaccion, 9);
assert.equal(calc({ porcentaje_satisfaccion: 90 }).cumplimiento_satisfaccion, 100);
assert.equal(calc({ porcentaje_satisfaccion: 90 }).aporte_satisfaccion, 10);
assert.equal(calc({ porcentaje_satisfaccion: 95 }).cumplimiento_satisfaccion, 105.56);
assert.equal(calc({ porcentaje_satisfaccion: 95 }).aporte_satisfaccion, 10.56);

assert.equal(calc({ porcentaje_administrativo: 100 }).aporte_administrativo, 10);
assert.equal(calc({ porcentaje_administrativo: 80, observacion_administrativa: 'Sustento' }).aporte_administrativo, 8);
assert.throws(
  () => calc({ porcentaje_administrativo: 80, observacion_administrativa: '' }),
  /sustento administrativo/i,
);

assert.equal(calc({
  porcentaje_retencion: 30,
  porcentaje_produccion_grupal: 50,
  porcentaje_satisfaccion: 90,
  porcentaje_administrativo: 100,
}).comision_total, 210);
assert.equal(calc({}).comision_total, 300);
assert.equal(calc({
  porcentaje_retencion: 40,
  porcentaje_produccion_grupal: 100,
  porcentaje_satisfaccion: 90,
  porcentaje_administrativo: 100,
}).comision_total, 300);
assert.equal(calc({
  porcentaje_retencion: 45,
  porcentaje_produccion_grupal: 100,
  porcentaje_satisfaccion: 90,
  porcentaje_administrativo: 100,
}).comision_total, 300);
assert.equal(calc({
  porcentaje_retencion: 50,
  porcentaje_produccion_grupal: 100,
  porcentaje_satisfaccion: 90,
  porcentaje_administrativo: 100,
}).comision_total, 350);
assert.equal(calc({
  porcentaje_retencion: 59.99,
  porcentaje_produccion_grupal: 100,
  porcentaje_satisfaccion: 90,
  porcentaje_administrativo: 100,
}).comision_total, 350);
assert.equal(calc({
  porcentaje_retencion: 60,
  porcentaje_produccion_grupal: 100,
  porcentaje_satisfaccion: 90,
  porcentaje_administrativo: 100,
}).comision_total, 400);
assert.equal(calc({
  porcentaje_retencion: 70,
  porcentaje_produccion_grupal: 100,
  porcentaje_satisfaccion: 90,
  porcentaje_administrativo: 100,
}).comision_total, 450);

console.log('Pruebas de medición de variables completadas correctamente.');

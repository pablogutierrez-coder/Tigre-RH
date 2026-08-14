import assert from 'node:assert/strict';
import { calculateTrainingVariableEvaluation } from './trainingVariableCalculator.js';

const baseInput = {
  porcentaje_retencion: 70,
  porcentaje_produccion_individual: 75,
  porcentaje_produccion_grupal: 100,
  porcentaje_satisfaccion: 90,
  porcentaje_administrativo: 100,
  observacion_administrativa: '',
};

const calc = (overrides: Partial<typeof baseInput>) =>
  calculateTrainingVariableEvaluation({ ...baseInput, ...overrides });

assert.equal(calc({ porcentaje_retencion: 70 }).cumplimiento_retencion, 100);
assert.equal(calc({ porcentaje_retencion: 70 }).aporte_retencion, 30);
assert.equal(calc({ porcentaje_retencion: 100 }).cumplimiento_retencion, 142.86);
assert.equal(calc({ porcentaje_retencion: 100 }).aporte_retencion, 42.86);
assert.equal(calc({ porcentaje_retencion: 35 }).cumplimiento_retencion, 50);
assert.equal(calc({ porcentaje_retencion: 35 }).aporte_retencion, 15);

assert.equal(calc({ porcentaje_produccion_grupal: 80 }).aporte_produccion, 40);
assert.equal(calc({ porcentaje_produccion_grupal: 100 }).aporte_produccion, 50);
assert.equal(calc({ porcentaje_produccion_grupal: 110 }).aporte_produccion, 55);
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

const belowMinimum = calc({
  porcentaje_retencion: 35,
  porcentaje_produccion_grupal: 80,
  porcentaje_satisfaccion: 90,
  porcentaje_administrativo: 100,
});
assert.equal(belowMinimum.cumplimiento_total, 75);
assert.equal(belowMinimum.comision_total, 0);

const immediatelyBelowMinimum = calc({ porcentaje_produccion_grupal: 69.98 });
assert.equal(immediatelyBelowMinimum.cumplimiento_total, 84.99);
assert.equal(immediatelyBelowMinimum.comision_total, 0);

const exactMinimum = calc({
  porcentaje_retencion: 70,
  porcentaje_produccion_grupal: 70,
  porcentaje_satisfaccion: 90,
  porcentaje_administrativo: 100,
});
assert.equal(exactMinimum.cumplimiento_total, 85);
assert.equal(exactMinimum.comision_total, 255);

assert.equal(calc({}).cumplimiento_total, 100);
assert.equal(calc({}).comision_total, 300);
assert.equal(calc({ porcentaje_produccion_grupal: 110 }).cumplimiento_total, 105);
assert.equal(calc({ porcentaje_produccion_grupal: 110 }).comision_total, 300);
assert.equal(calc({ porcentaje_produccion_grupal: 120 }).cumplimiento_total, 110);
assert.equal(calc({ porcentaje_produccion_grupal: 120 }).comision_total, 350);
assert.equal(calc({ porcentaje_produccion_grupal: 139.98 }).cumplimiento_total, 119.99);
assert.equal(calc({ porcentaje_produccion_grupal: 139.98 }).comision_total, 350);
assert.equal(calc({ porcentaje_produccion_grupal: 140 }).cumplimiento_total, 120);
assert.equal(calc({ porcentaje_produccion_grupal: 140 }).comision_total, 400);

console.log('Pruebas de medición de variables completadas correctamente.');

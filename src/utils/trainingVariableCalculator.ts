export interface TrainingVariableCalculationInput {
  porcentaje_retencion: number;
  porcentaje_produccion_individual: number;
  porcentaje_produccion_grupal: number;
  porcentaje_satisfaccion: number;
  porcentaje_administrativo: number;
  observacion_administrativa?: string;
}

const toBasisPoints = (value: number) => Math.round(Number(value || 0) * 100);
const fromBasisPoints = (value: number) => Math.round(value) / 100;
const divideRound = (numerator: number, denominator: number) => Math.round(numerator / denominator);
const moneyFromCents = (cents: number) => Math.round(cents) / 100;

export const calculateTrainingVariablePreview = (input: TrainingVariableCalculationInput) => {
  const retencionBp = toBasisPoints(input.porcentaje_retencion);
  const produccionGrupalBp = toBasisPoints(input.porcentaje_produccion_grupal);
  const satisfaccionBp = toBasisPoints(input.porcentaje_satisfaccion);
  const administrativoBp = toBasisPoints(input.porcentaje_administrativo);

  const cumplimientoRetencionBp = divideRound(retencionBp * 10000, 4000);
  const aporteRetencionBp = divideRound(cumplimientoRetencionBp * 4000, 10000);
  const aporteProduccionBp = divideRound(produccionGrupalBp * 4000, 10000);
  const cumplimientoSatisfaccionBp = divideRound(satisfaccionBp * 10000, 9000);
  const aporteSatisfaccionBp = divideRound(cumplimientoSatisfaccionBp * 1000, 10000);
  const aporteAdministrativoBp = divideRound(administrativoBp * 1000, 10000);
  const cumplimientoTotalBp =
    aporteRetencionBp + aporteProduccionBp + aporteSatisfaccionBp + aporteAdministrativoBp;

  const bloques = cumplimientoTotalBp > 10000 ? Math.floor((cumplimientoTotalBp - 10000) / 1000) : 0;
  const bonoCents = bloques * 5000;
  const comisionCents = cumplimientoTotalBp <= 10000
    ? divideRound(30000 * cumplimientoTotalBp, 10000)
    : 30000 + bonoCents;

  return {
    cumplimiento_retencion: fromBasisPoints(cumplimientoRetencionBp),
    aporte_retencion: fromBasisPoints(aporteRetencionBp),
    aporte_produccion: fromBasisPoints(aporteProduccionBp),
    cumplimiento_satisfaccion: fromBasisPoints(cumplimientoSatisfaccionBp),
    aporte_satisfaccion: fromBasisPoints(aporteSatisfaccionBp),
    aporte_administrativo: fromBasisPoints(aporteAdministrativoBp),
    cumplimiento_total: fromBasisPoints(cumplimientoTotalBp),
    comision_base: 300,
    bloques_sobrecumplimiento: bloques,
    bono_sobrecumplimiento: moneyFromCents(bonoCents),
    comision_total: moneyFromCents(comisionCents),
  };
};

export const enableDataPolicyModule = false;

export interface DataPolicyModuleConfig {
  enabled: boolean;
  version: string;
  title: string;
  description: string;
}

export const getDataPolicyModuleConfig = (): DataPolicyModuleConfig => ({
  enabled: enableDataPolicyModule,
  version: 'draft-0',
  title: 'Políticas y tratamiento de datos',
  description: 'Cascarón técnico preparado para activarse en una fase posterior.',
});

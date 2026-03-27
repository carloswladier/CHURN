export interface DashboardData {
  nm_cidade: string;
  med_churn_total: number;
  cd_node: string;
  outage: number;
  at1: string;
  cr_retencao: number;
  cr_tecnico: number;
  cr_financeiro: number;
  tamanho_base: string;
  class_mes_vol_m3: string;
  class_6_meses_vol: string;
  marc_unico: number;
  criticidade: string;
  [key: string]: any;
}

export interface FilterState {
  nm_cidade: string[];
  tamanho_base: string[];
  class_mes_vol_m3: string[];
  class_6_meses_vol: string[];
  criticidade: string[];
}

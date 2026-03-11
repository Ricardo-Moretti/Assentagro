// ============================================================
// AssetAgro — Validação de formulários
// ============================================================

import type { CreateAssetDto } from './models';

export interface ValidationError {
  field: string;
  message: string;
}

/// Valida dados de criação/edição de ativo
export function validateAsset(dto: Partial<CreateAssetDto>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!dto.service_tag?.trim()) {
    errors.push({ field: 'service_tag', message: 'Service Tag é obrigatório.' });
  }

  if (!dto.equipment_type) {
    errors.push({ field: 'equipment_type', message: 'Tipo de equipamento é obrigatório.' });
  }

  if (!dto.status) {
    errors.push({ field: 'status', message: 'Status é obrigatório.' });
  }

  if (!dto.branch_id) {
    errors.push({ field: 'branch_id', message: 'Filial é obrigatória.' });
  }

  // Regra de negócio: "Em Uso" exige colaborador
  if (dto.status === 'IN_USE' && !dto.employee_name?.trim()) {
    errors.push({
      field: 'employee_name',
      message: 'Colaborador é obrigatório quando status é "Em Uso".',
    });
  }

  if (!dto.ram_gb || dto.ram_gb <= 0) {
    errors.push({ field: 'ram_gb', message: 'Memória RAM é obrigatória.' });
  }

  if (!dto.storage_capacity_gb || dto.storage_capacity_gb <= 0) {
    errors.push({ field: 'storage_capacity_gb', message: 'Capacidade de armazenamento é obrigatória.' });
  }

  if (!dto.storage_type) {
    errors.push({ field: 'storage_type', message: 'Tipo de armazenamento é obrigatório.' });
  }

  if (!dto.os?.trim()) {
    errors.push({ field: 'os', message: 'Sistema operacional é obrigatório.' });
  }

  return errors;
}

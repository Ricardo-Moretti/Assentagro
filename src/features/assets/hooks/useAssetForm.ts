import { useState, useEffect, useRef, useCallback } from 'react';
import type { CreateAssetDto, Asset } from '@/domain/models';
import { validateAsset, type ValidationError } from '@/domain/validators';
import * as api from '@/data/commands';

type FormState = Partial<CreateAssetDto>;
export type TagStatus = 'idle' | 'checking' | 'available' | 'taken';

export function useAssetForm(initial?: Asset) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          service_tag: initial.service_tag,
          equipment_type: initial.equipment_type,
          status: initial.status,
          employee_name: initial.employee_name,
          branch_id: initial.branch_id,
          ram_gb: initial.ram_gb,
          storage_capacity_gb: initial.storage_capacity_gb,
          storage_type: initial.storage_type,
          os: initial.os,
          cpu: initial.cpu,
          model: initial.model || '',
          year: initial.year,
          notes: initial.notes || '',
          warranty_start: initial.warranty_start || null,
          warranty_end: initial.warranty_end || null,
        }
      : {
          equipment_type: 'NOTEBOOK',
          status: 'STOCK',
          storage_type: 'SSD_NVME',
          os: 'Windows 11',
          ram_gb: 8,
          storage_capacity_gb: 256,
          model: '',
          year: null,
          warranty_start: null,
          warranty_end: null,
        },
  );
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [saving, setSaving] = useState(false);
  const [tagStatus, setTagStatus] = useState<TagStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Validação de Service Tag em tempo real
  const checkTag = useCallback(
    (tag: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!tag || tag.trim().length < 3) {
        setTagStatus('idle');
        return;
      }
      // Se editando e tag não mudou, não verifica
      if (initial && tag.trim().toUpperCase() === initial.service_tag.toUpperCase()) {
        setTagStatus('idle');
        return;
      }
      setTagStatus('checking');
      debounceRef.current = setTimeout(async () => {
        try {
          const exists = await api.verificarServiceTag(tag.trim(), initial?.id);
          setTagStatus(exists ? 'taken' : 'available');
        } catch {
          setTagStatus('idle');
        }
      }, 500);
    },
    [initial],
  );

  // Limpa timeout ao desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => {
      const updated = { ...f, [key]: value };
      // Limpa colaborador quando status não é "Em Uso"
      if (key === 'status' && value !== 'IN_USE') {
        updated.employee_name = null;
      }
      return updated;
    });
    // Limpa erro do campo ao editar
    setErrors((prev) => prev.filter((e) => e.field !== key));
    // Verifica tag em tempo real
    if (key === 'service_tag') {
      checkTag(value as string);
    }
  };

  const submit = async (): Promise<Asset | null> => {
    const errs = validateAsset(form);
    if (errs.length > 0) {
      setErrors(errs);
      return null;
    }

    setSaving(true);
    setErrors([]);
    try {
      const dto = form as CreateAssetDto;
      if (initial?.id) {
        return await api.atualizarAtivo(initial.id, dto);
      } else {
        return await api.criarAtivo(dto);
      }
    } catch (e) {
      const msg = String(e);
      // Detecta erro de Service Tag duplicada
      if (msg.includes('UNIQUE') || msg.includes('service_tag')) {
        setErrors([{ field: 'service_tag', message: 'Service Tag já existe no sistema.' }]);
      } else {
        setErrors([{ field: '_root', message: msg }]);
      }
      return null;
    } finally {
      setSaving(false);
    }
  };

  const getError = (field: string) =>
    errors.find((e) => e.field === field)?.message;

  const rootError = errors.find((e) => e.field === '_root')?.message;

  return { form, setField, errors, saving, submit, getError, rootError, tagStatus };
}

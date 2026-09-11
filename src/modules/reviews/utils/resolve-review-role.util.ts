import { Op } from 'sequelize';

import { RoleModel } from '../../../database/models/role.model';

const ROLE_ALIASES: Record<string, string> = {
  'case manager / social worker': 'Social Worker',
  'certified registered nurse anesthetist (crna)': 'Other',
  'er technician': 'Other',
  'advanced practice rn / np (aprn)': 'Nurse Practitioner (NP, APRN)',
  'np / aprn': 'Nurse Practitioner (NP, APRN)',
  'physician assistant (pa-c)': 'Physician Associate (PA-C)',
  'dietitian': 'Registered Dietitian',
  'physical therapy assistant / aide': 'Physical Therapist (PT)',
  'radiology technician (xr, ct, mri, us, etc.)': 'Radiologic Technologist',
  'sterile processing technician': 'Other',
  'surgical tech': 'Surgical Technologist',
};

export async function resolveReviewRoleId(
  roleModel: typeof RoleModel,
  roleName: string | undefined,
  fallbackRoleId: number,
): Promise<number> {
  const normalizedInput = roleName?.trim();

  if (!normalizedInput) {
    return fallbackRoleId;
  }

  const exact = await roleModel.findOne({
    where: { name: normalizedInput },
  });

  if (exact) {
    return exact.id;
  }

  const aliasTarget = ROLE_ALIASES[normalizedInput.toLowerCase()];

  if (aliasTarget) {
    const aliased = await roleModel.findOne({
      where: { name: aliasTarget },
    });

    if (aliased) {
      return aliased.id;
    }
  }

  const fuzzy = await roleModel.findOne({
    where: {
      name: {
        [Op.iLike]: `%${normalizedInput.slice(0, 24)}%`,
      },
    },
  });

  if (fuzzy) {
    return fuzzy.id;
  }

  const other = await roleModel.findOne({
    where: { name: 'Other' },
  });

  return other?.id ?? fallbackRoleId;
}

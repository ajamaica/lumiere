import React from 'react'
import { useTranslation } from 'react-i18next'

import type { MissionStatus } from '../../store/missionTypes'
import { Badge, BadgeProps } from '../ui'

type BadgeVariant = 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'

const STATUS_VARIANT: Record<MissionStatus, BadgeVariant> = {
  pending: 'default',
  in_progress: 'info',
  idle: 'warning',
  completed: 'success',
  error: 'error',
}

interface MissionStatusBadgeProps extends Omit<BadgeProps, 'label' | 'variant'> {
  status: MissionStatus
}

export function MissionStatusBadge({ status, ...props }: MissionStatusBadgeProps) {
  const { t } = useTranslation()

  const LABELS: Record<MissionStatus, string> = {
    pending: t('missions.status.pending'),
    in_progress: t('missions.status.in_progress'),
    idle: t('missions.status.idle'),
    completed: t('missions.status.completed'),
    error: t('missions.status.error'),
  }

  return <Badge label={LABELS[status]} variant={STATUS_VARIANT[status]} {...props} />
}

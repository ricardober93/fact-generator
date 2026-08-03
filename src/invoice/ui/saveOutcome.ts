export const CONFLICT_MESSAGE = 'Otro guardado se adelantó. Tus cambios siguen aquí.'
export const SAVED_MESSAGE = 'Guardada'

export interface ISaveReply {
  status?: string
  id: string
  rev: number
  duplicate: boolean
}

export interface ISaveState {
  id: string | null
  rev: number
  status: string
  duplicate: boolean
}

export function nextSaveState(current: ISaveState, reply: ISaveReply): ISaveState {
  if (!current || !reply) throw new Error('nextSaveState requires the current state and a reply')
  if (reply.status === 'conflict') {
    return { ...current, rev: reply.rev, status: CONFLICT_MESSAGE }
  }
  return { id: reply.id, rev: reply.rev, status: SAVED_MESSAGE, duplicate: reply.duplicate }
}

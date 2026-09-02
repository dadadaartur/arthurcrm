// Единая арифметика периодов для регулярных заданий. Вынесено отдельным
// модулем, а не написано прямо внутри cron-задачи, чтобы при появлении
// клиентских подсказок («до сброса осталось 3 часа», предпросмотр
// следующего периода в форме создания) использовалась ровно та же
// логика, а не второй, отдельно написанный и потенциально разошедшийся
// с первым вариант.

const MS_HOUR = 3600 * 1000

/**
 * Текущий ключ периода для регулярного задания на момент now.
 * null — задание разовое (period_key не используется).
 */
export function currentPeriodKey(task, now = new Date()) {
  const type = task.recurrence_type || 'once'
  if (type === 'once') return null
  const resetHour = Number.isFinite(task.reset_hour) ? task.reset_hour : 8

  // Сдвигаем "теперь" назад на reset_hour — тогда "сутки" этого задания
  // начинаются не в полночь, а в reset_hour, и дальнейшая арифметика
  // остаётся простой: просто берём календарную дату сдвинутого момента.
  const shifted = new Date(now.getTime() - resetHour * MS_HOUR)

  if (type === 'hourly') {
    return shifted.toISOString().slice(0, 13) // 2026-09-01T14
  }
  if (type === 'daily') {
    return shifted.toISOString().slice(0, 10) // 2026-09-01
  }
  if (type === 'weekly') {
    return isoWeekKey(shifted) // 2026-W36
  }
  return null
}

function isoWeekKey(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

/**
 * Попадает ли текущий момент в заданное окно действия регулярности
 * (recurrence_start_date / recurrence_end_date). Обе границы
 * необязательны — null с любой стороны означает "без ограничения".
 */
export function isWithinRecurrenceWindow(task, now = new Date()) {
  const today = now.toISOString().slice(0, 10)
  if (task.recurrence_start_date && today < task.recurrence_start_date) return false
  if (task.recurrence_end_date && today > task.recurrence_end_date) return false
  return true
}

/** Человекочитаемая подпись типа регулярности — для интерфейса. */
export const RECURRENCE_LABELS = {
  once: 'Разово',
  hourly: 'Каждый час',
  daily: 'Каждый день',
  weekly: 'Каждую неделю',
}

/** Сколько (примерно) времени осталось до следующего сброса — для
 *  подсказки в интерфейсе сотрудника ("сбросится через 2 ч 15 мин"). */
export function timeUntilNextReset(task, now = new Date()) {
  const type = task.recurrence_type || 'once'
  if (type === 'once') return null
  const resetHour = Number.isFinite(task.reset_hour) ? task.reset_hour : 8
  const next = new Date(now)
  if (type === 'hourly') {
    next.setMinutes(0, 0, 0)
    next.setHours(next.getHours() + 1)
  } else if (type === 'daily') {
    next.setHours(resetHour, 0, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
  } else if (type === 'weekly') {
    // Ближайший понедельник (день 1) в reset_hour от текущего момента.
    next.setHours(resetHour, 0, 0, 0)
    const day = next.getDay() || 7
    const daysToAdd = day === 1 && next > now ? 0 : (8 - day) % 7 || 7
    next.setDate(next.getDate() + daysToAdd)
  } else {
    return null
  }
  return next.getTime() - now.getTime()
}

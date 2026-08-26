// Вычисление «зоны ответственности» руководителя по дереву отделов
// (миграция 011). Один источник правды для всех мест, где нужно решить
// «что видит/чем управляет этот конкретный человек» — вместо того, чтобы
// повторять обход дерева в каждом файле по отдельности.

/** { parentId -> [childId, ...] } */
export function buildChildMap(departments) {
  const map = {}
  departments.forEach(d => {
    const p = d.parent_department_id || null
    if (!map[p]) map[p] = []
    map[p].push(d.id)
  })
  return map
}

/** ID отдела + все вложенные на любую глубину (обход в ширину). */
export function getSubtreeIds(departments, rootId) {
  const childMap = buildChildMap(departments)
  const result = new Set([rootId])
  const queue = [rootId]
  while (queue.length) {
    const current = queue.shift()
    ;(childMap[current] || []).forEach(childId => {
      if (!result.has(childId)) { result.add(childId); queue.push(childId) }
    })
  }
  return [...result]
}

/**
 * Возвращает зону ответственности сотрудника:
 * - null — вся компания целиком (админ компании, видит и управляет всем);
 * - [] — не руководитель ни одного отдела, своей зоны нет;
 * - [id, id, ...] — свой(и) отдел(ы) + все вложенные на любую глубину
 *   (руководитель руководителей автоматически получает в зону все
 *   команды своих подчинённых руководителей — дерево работает само по
 *   себе, никакой отдельной логики "руководитель руководителей" не
 *   нужно, просто идём по parent_department_id вглубь).
 */
export function getManagerScope(profile, allDepartments) {
  if (profile.is_company_admin) return null
  const myDepartments = (allDepartments || []).filter(d => d.manager_user_id === profile.user_id)
  if (myDepartments.length === 0) return []
  const scope = new Set()
  myDepartments.forEach(d => getSubtreeIds(allDepartments, d.id).forEach(id => scope.add(id)))
  return [...scope]
}

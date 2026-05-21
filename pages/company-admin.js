async function handleCreateEmployee(e) {
  e.preventDefault()
  if (!newName || !newEmail || !newRoleId) return

  try {
    const token = crypto.randomUUID()
    const tempPassword = Math.random().toString(36).slice(-8)

    const { error: inviteError } = await supabase.from('invitations').insert({
      company_id: profile.company_id,
      role_id: parseInt(newRoleId),
      email: newEmail,
      token,
      temp_password: tempPassword,
      created_by: user.id,
    })
    if (inviteError) throw inviteError

    setInviteResult({
      link: `${window.location.origin}/invite?token=${token}`,
      tempPassword,
    })

    setNewName('')
    setNewEmail('')
    setNewPosition('')
    setNewRoleId(roles[0]?.id || '')
  } catch (err) {
    alert('Ошибка при создании приглашения: ' + err.message)
  }
}

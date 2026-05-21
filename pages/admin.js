async function handleCreateCompany(e) {
  e.preventDefault()
  if (!newCompanyName || !newCompanyAdminEmail) return

  try {
    const { data: company, error: companyError } = await supabase.from('companies').insert({ name: newCompanyName }).select().single()
    if (companyError) throw companyError

    const { data: role, error: roleError } = await supabase.from('roles').insert({ name: 'Администратор', company_id: company.id }).select().single()
    if (roleError) throw roleError

    const token = crypto.randomUUID()
    const tempPassword = Math.random().toString(36).slice(-8)

    const { error: inviteError } = await supabase.from('invitations').insert({
      company_id: company.id,
      role_id: role.id,
      email: newCompanyAdminEmail,
      token,
      temp_password: tempPassword,
      created_by: user.id,
    })
    if (inviteError) throw inviteError

    setCompanyCreationResult({
      link: `${window.location.origin}/invite?token=${token}`,
      tempPassword,
    })

    setNewCompanyName('')
    setNewCompanyAdminEmail('')
    fetchCompanies()
  } catch (err) {
    alert('Ошибка при создании компании: ' + err.message)
  }
}

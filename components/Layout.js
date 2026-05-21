useEffect(() => {
  supabase.auth.getUser().then(({ data: { user } }) => {
    setUser(user)
    if (user) {
      supabase
        .from('profiles')
        .select('display_name, roles(name, is_system)')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => setProfile(data))
    } else {
      setProfile(null)
    }
  })
}, [])

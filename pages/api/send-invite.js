import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' })
  }

  const { email, link, tempPassword } = req.body

  if (!email || !link || !tempPassword) {
    return res.status(400).json({ error: 'Не все поля заполнены' })
  }

  // Настройка транспорта SMTP (данные из переменных окружения)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true для 465 порта, иначе false
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@karmabank.ru',
    to: email,
    subject: 'Приглашение в Кармический банк',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Добро пожаловать в Кармический банк!</h2>
        <p>Вы были приглашены в качестве сотрудника. Для активации аккаунта перейдите по ссылке:</p>
        <p><a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #C5A04E; color: white; text-decoration: none; border-radius: 5px;">Активировать аккаунт</a></p>
        <p>Ваш временный пароль: <strong>${tempPassword}</strong></p>
        <p>Ссылка действительна в течение 24 часов.</p>
        <p>С уважением,<br/>Команда Кармического банка</p>
      </div>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    res.status(200).json({ success: true, message: 'Письмо отправлено' })
  } catch (error) {
    console.error('Ошибка отправки письма:', error)
    res.status(500).json({ error: 'Не удалось отправить письмо' })
  }
}

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // Mã hóa mật khẩu "123456" cho bảo mật
  const hashedPassword = await bcrypt.hash('123456', 10)
  
  // Tạo bác sĩ đầu tiên
  const doctor = await prisma.doctor.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      name: 'Bác sĩ MiceBach',
    },
  })

  // Tạo sẵn 1 bệnh nhân mẫu cho bác sĩ này
  await prisma.patient.upsert({
    where: { id: 'BN-001' },
    update: {},
    create: {
      id: 'BN-001',
      name: 'Nguyễn Văn A',
      age: 45,
      gender: 'Nam',
      doctorId: doctor.id
    }
  })

  console.log('✅ Đã tạo tài khoản: admin / 123456')
  console.log('✅ Đã tạo bệnh nhân mẫu: BN-001')
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect())
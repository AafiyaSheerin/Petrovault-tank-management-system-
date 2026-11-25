const supabase = require('./supabaseClient');
const { hashPassword } = require('../utils/hashPassword');

const seed = async () => {
  console.log('🌱 Seeding PetroVault database...');

  try {
    // 1. Create admin user
    console.log('👤 Creating admin user...');
    const adminPassword = await hashPassword('admin@petrovault');

    const { data: admin, error: adminError } = await supabase
      .from('users')
      .upsert({
        username: 'admin',
        password_hash: adminPassword,
        full_name: 'PetroVault Admin',
        email: 'admin@petrovault.com',
        phone: '9999999999',
        role: 'admin',
        is_active: true
      }, { onConflict: 'username' })
      .select()
      .single();

    if (adminError) throw adminError;
    console.log('✅ Admin user created');

    // 2. Create demo employees
    console.log('👥 Creating demo employees...');
    const emp1Password = await hashPassword('9876543210');
    const emp2Password = await hashPassword('9123456780');

    const { data: employees, error: empError } = await supabase
      .from('users')
      .upsert([
        {
          username: 'ravi',
          password_hash: emp1Password,
          full_name: 'Ravi Kumar',
          email: 'ravi@petrovault.com',
          phone: '9876543210',
          role: 'editor',
          is_active: true
        },
        {
          username: 'priya',
          password_hash: emp2Password,
          full_name: 'Priya Sharma',
          email: 'priya@petrovault.com',
          phone: '9123456780',
          role: 'viewer',
          is_active: true
        }
      ], { onConflict: 'username' })
      .select();

    if (empError) throw empError;
    console.log('✅ Demo employees created');

    // 3. Create demo products
    console.log('🛢️ Creating demo products...');
    const { data: products, error: prodError } = await supabase
      .from('products')
      .upsert([
        {
          name: 'Furnace Oil',
          density_kg_per_litre: 0.95,
          description: 'Heavy furnace oil',
          color: '#f97316'
        },
        {
          name: 'Ship Oil',
          density_kg_per_litre: 0.91,
          description: 'Marine ship oil',
          color: '#3b82f6'
        },
        {
          name: 'Used Oil',
          density_kg_per_litre: 0.88,
          description: 'Recycled used oil',
          color: '#8b5cf6'
        },
        {
          name: 'Sludge',
          density_kg_per_litre: 1.02,
          description: 'Oil sludge waste',
          color: '#78716c'
        },
        {
          name: 'Crude Oil',
          density_kg_per_litre: 0.85,
          description: 'Raw crude oil',
          color: '#854d0e'
        }
      ], { onConflict: 'name' })
      .select();

    if (prodError) throw prodError;
    console.log('✅ Demo products created');

    // 4. Create demo tanks
    console.log('🏭 Creating demo tanks...');
    const { data: tanks, error: tankError } = await supabase
      .from('tanks')
      .upsert([
        {
          name: 'C1',
          shape: 'cone_bottom',
          capacity_litres: 28000,
          location: 'Zone A',
          product_id: products[3].id,
          low_threshold: 20,
          high_threshold: 90,
          created_by: admin.id
        },
        {
          name: 'C2',
          shape: 'cone_bottom',
          capacity_litres: 28000,
          location: 'Zone A',
          product_id: products[0].id,
          low_threshold: 20,
          high_threshold: 90,
          created_by: admin.id
        },
        {
          name: 'C3',
          shape: 'cone_bottom',
          capacity_litres: 28000,
          location: 'Zone A',
          product_id: products[1].id,
          low_threshold: 20,
          high_threshold: 90,
          created_by: admin.id
        },
        {
          name: 'R1',
          shape: 'rectangular',
          capacity_litres: 50000,
          location: 'Zone B',
          product_id: products[4].id,
          low_threshold: 20,
          high_threshold: 90,
          created_by: admin.id
        },
        {
          name: 'R2',
          shape: 'rectangular',
          capacity_litres: 50000,
          location: 'Zone B',
          product_id: products[0].id,
          low_threshold: 20,
          high_threshold: 90,
          created_by: admin.id
        },
        {
          name: 'S1',
          shape: 'cylinder',
          capacity_litres: 35000,
          location: 'Zone C',
          product_id: products[2].id,
          low_threshold: 20,
          high_threshold: 90,
          created_by: admin.id
        }
      ], { onConflict: 'name' })
      .select();

    if (tankError) throw tankError;
    console.log('✅ Demo tanks created');

    // 5. Create tank levels
    console.log('📊 Creating tank levels...');
    const tankLevels = [
      { tank_id: tanks[0].id, current_volume: 0, fill_percentage: 0, status: 'empty' },
      { tank_id: tanks[1].id, current_volume: 8937, fill_percentage: 31.9, status: 'healthy' },
      { tank_id: tanks[2].id, current_volume: 5327, fill_percentage: 19.0, status: 'critical' },
      { tank_id: tanks[3].id, current_volume: 42500, fill_percentage: 85.0, status: 'warning' },
      { tank_id: tanks[4].id, current_volume: 50000, fill_percentage: 100.0, status: 'warning' },
      { tank_id: tanks[5].id, current_volume: 1050, fill_percentage: 3.0, status: 'critical' }
    ];

    const { error: levelError } = await supabase
      .from('tank_levels')
      .upsert(tankLevels, { onConflict: 'tank_id' });

    if (levelError) throw levelError;
    console.log('✅ Tank levels created');

    // 6. Set employee permissions
    console.log('🔐 Setting employee permissions...');
    const { error: permError } = await supabase
      .from('employee_permissions')
      .upsert([
        {
          employee_id: employees[0].id,
          can_view_tanks: true,
          can_add_stock: true,
          can_edit_tank: false,
          can_delete_tank: false,
          can_view_reports: true,
          can_export: false,
          can_view_logs: false,
          can_convert_volume: true
        },
        {
          employee_id: employees[1].id,
          can_view_tanks: true,
          can_add_stock: false,
          can_edit_tank: false,
          can_delete_tank: false,
          can_view_reports: true,
          can_export: false,
          can_view_logs: false,
          can_convert_volume: true
        }
      ], { onConflict: 'employee_id' });

    if (permError) throw permError;
    console.log('✅ Employee permissions set');

    // 7. Grant tank access to employees
    console.log('🔓 Granting tank access...');
    const { error: accessError } = await supabase
      .from('employee_tank_access')
      .upsert([
        { employee_id: employees[0].id, tank_id: tanks[0].id, granted_by: admin.id },
        { employee_id: employees[0].id, tank_id: tanks[1].id, granted_by: admin.id },
        { employee_id: employees[0].id, tank_id: tanks[2].id, granted_by: admin.id },
        { employee_id: employees[1].id, tank_id: tanks[3].id, granted_by: admin.id },
        { employee_id: employees[1].id, tank_id: tanks[4].id, granted_by: admin.id }
      ], { onConflict: 'employee_id, tank_id' });

    if (accessError) throw accessError;
    console.log('✅ Tank access granted');

    console.log('');
    console.log('🎉 Database seeded successfully!');
    console.log('');
    console.log('📋 Demo Login Credentials:');
    console.log('   Admin    → username: admin    | password: admin@petrovault');
    console.log('   Editor   → username: ravi     | password: 9876543210 (phone)');
    console.log('   Viewer   → username: priya    | password: 9123456780 (phone)');
    console.log('');

  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
};

seed();
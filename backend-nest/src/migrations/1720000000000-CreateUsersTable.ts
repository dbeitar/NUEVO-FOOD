import { MigrationInterface, QueryRunner, Table } from 'typeorm'

export class CreateUsersTable1720000000000 implements MigrationInterface {
  name = 'CreateUsersTable1720000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '120', isNullable: false },
          { name: 'email', type: 'varchar', length: '160', isNullable: false, isUnique: true },
          { name: 'gender', type: "enum('Masculino','Femenino','Otro')", isNullable: false, default: `'Otro'` },
          { name: 'hasRestrictions', type: 'tinyint', width: 1, isNullable: false, default: 0 },
          { name: 'restrictionDetails', type: 'text', isNullable: true }
        ]
      }),
      true
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users')
  }
}

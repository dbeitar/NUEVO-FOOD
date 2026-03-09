"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUsersTable1720000000000 = void 0;
const typeorm_1 = require("typeorm");
class CreateUsersTable1720000000000 {
    constructor() {
        this.name = 'CreateUsersTable1720000000000';
    }
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'users',
            columns: [
                { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
                { name: 'name', type: 'varchar', length: '120', isNullable: false },
                { name: 'email', type: 'varchar', length: '160', isNullable: false, isUnique: true },
                { name: 'gender', type: "enum('Masculino','Femenino','Otro')", isNullable: false, default: `'Otro'` },
                { name: 'hasRestrictions', type: 'tinyint', width: 1, isNullable: false, default: 0 },
                { name: 'restrictionDetails', type: 'text', isNullable: true }
            ]
        }), true);
    }
    async down(queryRunner) {
        await queryRunner.dropTable('users');
    }
}
exports.CreateUsersTable1720000000000 = CreateUsersTable1720000000000;

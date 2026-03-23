StudentGrade.init({
    grade_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    student_pk: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    task_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    batch_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    module_id: { type: DataTypes.INTEGER, allowNull: false }, // Denormalized for speed
    obtained_score: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        validate: { min: 0 }
    }
}, {
    sequelize,
    modelName: 'student_grade',
    tableName: 'student_grades',
    timestamps: true,
    underscored: true,
    indexes: [
        { unique: true, fields: ['student_pk', 'task_id', 'module_id'] }
    ]
});

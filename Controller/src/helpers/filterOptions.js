import {} from 'sequelize';
//Aprender a usar esta mamada
export function FilterOptions(filter) {
    const whereClause = {};
    Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            whereClause[key] = value;
        }
    });
    return whereClause;
}
//# sourceMappingURL=filterOptions.js.map
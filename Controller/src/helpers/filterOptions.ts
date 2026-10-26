import {type WhereOptions } from 'sequelize';

//Aprender a usar esta mamada
export function FilterOptions<T extends object = Record<string, unknown>>(filter: Record<string, unknown>): WhereOptions<T> {
    const whereClause: WhereOptions<T> = {};
    Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            (whereClause as Record<string, unknown>)[key] = value;
        }
    });
    return whereClause;
}
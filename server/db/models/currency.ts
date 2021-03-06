import { Table, Column, Model, DataType, AutoIncrement, HasMany, PrimaryKey } from "sequelize-typescript";

@Table({
  tableName: "currency",
})
export class Currency extends Model<Currency> {

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @Column(DataType.STRING)
  currency_name: string;

  @Column(DataType.STRING)
  display_name: string;

  @Column(DataType.DATE)
  created_at: string;

  @Column(DataType.DATE)
  updated_at: string;

}

export default Currency;

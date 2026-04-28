"use client";

import { FaBagShopping, FaSackDollar } from "react-icons/fa6";

import { Card, CardContent } from "@/components/ui/card";

import { formatCurrency } from "@/lib/currency";

type Props = {
  totalOrders: number;
  totalSpentMinor: number;
};

export function UserStatsCard({ totalOrders, totalSpentMinor }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardContent className="p-4 flex flex-col items-center gap-2">
          <p className="text-base font-semibold">Total Pedidos</p>

          <div className="flex items-center gap-2 w-full justify-center pr-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
              <FaBagShopping className="size-5" />
            </div>
            <h3 className="text-2xl font-bold foreground">{totalOrders}</h3>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex flex-col items-center gap-2">
          <p className="text-base font-semibold"> Gasto Total (LTV)</p>

          <div className="flex items-center gap-2 w-full justify-center pr-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
              <FaSackDollar className="size-5" />
            </div>
            <h3 className="text-2xl font-bold foreground">
              {" "}
              {formatCurrency(totalSpentMinor)}
            </h3>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

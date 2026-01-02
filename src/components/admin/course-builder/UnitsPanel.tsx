import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createUnit } from '@/server/actions/units/createUnit';
import { reorderUnits } from '@/server/actions/units/reorderUnits';
import { updateUnit } from '@/server/actions/units/updateUnit';

export type BuilderUnit = {
  id: string;
  title: string;
  order_index: number | null;
  lessons: { id: string }[];
};

type UnitsPanelProps = {
  moduleId: string;
  units: BuilderUnit[];
  activeUnitId: string | null;
  basePath: string;
  locationId?: string;
};

export default function UnitsPanel({
  moduleId,
  units,
  activeUnitId,
  basePath,
  locationId,
}: UnitsPanelProps) {
  const createUnitAction = async (formData: FormData) => {
    'use server';
    await createUnit(formData);
  };
  const reorderUnitsAction = async (formData: FormData) => {
    'use server';
    await reorderUnits(formData);
  };
  const updateUnitAction = async (formData: FormData) => {
    'use server';
    await updateUnit(formData);
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Unidades</CardTitle>
        <CardDescription>Creacion y orden del curso.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          action={createUnitAction}
          className="flex items-center gap-2"
        >
          <input type="hidden" name="module_id" value={moduleId} />
          {locationId ? (
            <input type="hidden" name="location_id" value={locationId} />
          ) : null}
          <Input name="title" placeholder="Nueva unidad" required />
          <Button type="submit" size="sm">
            Crear
          </Button>
        </form>

        {units.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay unidades. Crea la primera unidad.
          </p>
        ) : (
          <div className="space-y-3">
            {units.map((unit, index) => {
              const isActive = unit.id === activeUnitId;
              return (
                <div
                  key={unit.id}
                  className={`rounded-lg border p-3 text-sm ${
                    isActive ? 'border-foreground/30 bg-muted/40' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`${basePath}?unitId=${unit.id}`}
                      className="font-medium hover:underline"
                    >
                      {unit.title}
                    </Link>
                    <div className="flex items-center gap-2 text-xs">
                      <Link
                        href={`${basePath}/units/${unit.id}/quiz`}
                        className="text-primary hover:underline"
                      >
                        Editar quiz
                      </Link>
                      <span className="text-muted-foreground">
                        {unit.lessons.length} lecciones
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <form
                      action={reorderUnitsAction}
                    >
                      <input type="hidden" name="module_id" value={moduleId} />
                      {locationId ? (
                        <input type="hidden" name="location_id" value={locationId} />
                      ) : null}
                      <input type="hidden" name="unit_id" value={unit.id} />
                      <input type="hidden" name="direction" value="up" />
                      <Button
                        type="submit"
                        variant="outline"
                        size="icon-sm"
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                    </form>
                    <form
                      action={reorderUnitsAction}
                    >
                      <input type="hidden" name="module_id" value={moduleId} />
                      {locationId ? (
                        <input type="hidden" name="location_id" value={locationId} />
                      ) : null}
                      <input type="hidden" name="unit_id" value={unit.id} />
                      <input type="hidden" name="direction" value="down" />
                      <Button
                        type="submit"
                        variant="outline"
                        size="icon-sm"
                        disabled={index === units.length - 1}
                      >
                        ↓
                      </Button>
                    </form>
                    <form
                      action={updateUnitAction}
                      className="flex flex-1 gap-2"
                    >
                      <input type="hidden" name="module_id" value={moduleId} />
                      {locationId ? (
                        <input type="hidden" name="location_id" value={locationId} />
                      ) : null}
                      <input type="hidden" name="unit_id" value={unit.id} />
                      <Input
                        name="title"
                        defaultValue={unit.title}
                        className="h-8"
                      />
                      <Button type="submit" size="sm" variant="secondary">
                        Guardar
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * D40, D41: cada clínica configura nome e logo na instalação; sem logo, vale o logotipo
 * tipográfico provisório ("Luby" + "Vet" em primary, Figtree 700).
 */
export function Brand({ clinicName, logoUrl }: { clinicName: string; logoUrl: string | undefined }) {
  return (
    <div className="mb-4 grid gap-1 px-2">
      {logoUrl ? (
        <img src={logoUrl} alt={clinicName} className="h-8 w-auto" />
      ) : (
        <p className="text-base font-bold">
          Luby<span className="text-primary">Vet</span>
        </p>
      )}
      {clinicName && <p className="text-xs text-muted-foreground">{clinicName}</p>}
    </div>
  );
}

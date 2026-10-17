import { Coordinates, Qibla } from 'adhan';

export const qibla = (lat: number, lon: number) => Qibla(new Coordinates(lat, lon));

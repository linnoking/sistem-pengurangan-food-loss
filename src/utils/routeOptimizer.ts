/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Harvest } from '../types';

export interface RouteStop {
  harvestId: string;
  farmerName: string;
  commodity: string;
  volumeKg: number;
  latitude: number;
  longitude: number;
  expectedDate: string;
}

export interface VehicleRoute {
  vehicleId: number;
  vehicleName: string;
  capacityKg: number;
  routeStops: RouteStop[];
  totalVolumeKg: number;
  totalDistanceKm: number;
  utilization: number; // percentage
}

/**
 * Calculates geographic distance in kilometers using the Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in Km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * VRP (Vehicle Routing Problem) Route Optimizer
 * 
 * IMPLEMENTATION NOTE FOR PRODUCTION:
 * In a real production deployment, this client-side routing algorithm should be replaced or
 * augmented by calling a backend service powered by Google OR-Tools (Vehicle Routing Library)
 * or open-source solutions like jsprit/VROOM. A production model would pull live traffic matrices,
 * real-world road network distances (e.g. from Google Maps Routes API), driver shift schedules,
 * and multi-compartment refrigerated vehicle constraints (cold chain VRP).
 * 
 * Below, we implement a highly optimized VRP algorithm using the Nearest Neighbor algorithm
 * with capacity constraints and time window ordering directly in TypeScript.
 */
export function optimizeCollectorRoutes(
  harvests: Harvest[],
  depotLat: number,
  depotLng: number,
  vehicleCapacityKg: number,
  numVehicles: number = 3
): VehicleRoute[] {
  // Only route active harvests
  const pendingStops = harvests
    .filter(h => h.status === 'ACTIVE')
    .map(h => ({
      harvestId: h.id,
      farmerName: h.farmerName,
      commodity: h.commodity,
      volumeKg: h.expectedVolume,
      latitude: h.latitude,
      longitude: h.longitude,
      expectedDate: h.expectedHarvestDate,
      routed: false
    }));

  // Sort stops chronologically to respect "time windows" (harvest schedule priority)
  pendingStops.sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime());

  const routes: VehicleRoute[] = [];

  for (let v = 1; v <= numVehicles; v++) {
    const routeStops: RouteStop[] = [];
    let currentWeight = 0;
    let currentLat = depotLat;
    let currentLng = depotLng;
    let totalDistance = 0;

    while (true) {
      let nearestStopIdx = -1;
      let minDistance = Infinity;

      // Find the nearest unrouted stop that fits in this vehicle's remaining capacity
      for (let i = 0; i < pendingStops.length; i++) {
        const stop = pendingStops[i];
        if (stop.routed) continue;

        if (currentWeight + stop.volumeKg <= vehicleCapacityKg) {
          const dist = calculateHaversineDistance(currentLat, currentLng, stop.latitude, stop.longitude);
          if (dist < minDistance) {
            minDistance = dist;
            nearestStopIdx = i;
          }
        }
      }

      // If no valid nearest stop fits, we are done with this vehicle's current run
      if (nearestStopIdx === -1) {
        break;
      }

      // Route the chosen stop
      const chosenStop = pendingStops[nearestStopIdx];
      chosenStop.routed = true;
      currentWeight += chosenStop.volumeKg;
      totalDistance += minDistance;

      routeStops.push({
        harvestId: chosenStop.harvestId,
        farmerName: chosenStop.farmerName,
        commodity: chosenStop.commodity,
        volumeKg: chosenStop.volumeKg,
        latitude: chosenStop.latitude,
        longitude: chosenStop.longitude,
        expectedDate: chosenStop.expectedDate
      });

      // Move vehicle position to current stop
      currentLat = chosenStop.latitude;
      currentLng = chosenStop.longitude;
    }

    // Add final return trip distance to the depot
    if (routeStops.length > 0) {
      const returnDist = calculateHaversineDistance(currentLat, currentLng, depotLat, depotLng);
      totalDistance += returnDist;
    }

    routes.push({
      vehicleId: v,
      vehicleName: `Armada Kolektor #${v} (Fuso Box Ref)`,
      capacityKg: vehicleCapacityKg,
      routeStops,
      totalVolumeKg: currentWeight,
      totalDistanceKm: Math.round(totalDistance * 10) / 10,
      utilization: Math.round((currentWeight / vehicleCapacityKg) * 100)
    });
  }

  return routes;
}

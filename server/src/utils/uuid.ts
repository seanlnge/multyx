const UUIDSet = new Set();

/**
 * Generate a unique identifier across Multyx ecosystem
 * @param length Length of UUID
 * @param radix Base number to use for UUID characters
 * @returns 
 */
export function GenerateUUID(length: number = 8, radix: number = 36): string {
    const unit = radix ** (length - 1);
    const uuid = Math.floor(Math.random() * (radix * unit - unit) + unit).toString(radix);

    if(UUIDSet.has(uuid)) return GenerateUUID(length, radix);
    UUIDSet.add(uuid);
    return uuid;
}

/**
 * Add a UUID to the Multyx ecosystem global set
 * @param uuid UUID to add to set
 * @returns True if success, false if UUID already exists in set
 */
export function AddUUID(uuid: string) {
    if(UUIDSet.has(uuid)) return false;
    UUIDSet.add(uuid);
    return true;
}

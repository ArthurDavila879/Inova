ALTER TABLE proposals ADD COLUMN latitude DOUBLE NULL;
ALTER TABLE proposals ADD COLUMN longitude DOUBLE NULL;
ALTER TABLE proposals ADD CONSTRAINT ck_proposal_coordinates CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
);

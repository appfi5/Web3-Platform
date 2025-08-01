-- Comment out all and update by by another way

-- DO $$
-- DECLARE
--   affected_rows integer;
--   total_updated integer := 0;
--   start_time timestamp;
--   batch_start_time timestamp;
--   batch_duration interval;
-- BEGIN
--   start_time := clock_timestamp();
  
--   RAISE NOTICE 'Starting update process at %', start_time;
  
--   LOOP
--     batch_start_time := clock_timestamp();
    
--     WITH batch AS (
--       SELECT address.action_id
--       FROM web3platform_tx_action_address address
--       WHERE address.asset_id IS NULL
--       LIMIT 50000
--       FOR UPDATE SKIP LOCKED
--     )
--     UPDATE web3platform_tx_action_address address
--     SET 
--       asset_id = action.asset_id,
--       block_number = action.block_number
--     FROM web3platform_tx_action action
--     WHERE address.action_id = action.id
--     AND address.action_id IN (SELECT action_id FROM batch);
    
--     GET DIAGNOSTICS affected_rows = ROW_COUNT;
--     total_updated := total_updated + affected_rows;
--     batch_duration := clock_timestamp() - batch_start_time;
    
--     RAISE NOTICE 'Batch completed: % rows updated (total: %) in %', 
--       affected_rows, 
--       total_updated, 
--       batch_duration;
      
--     EXIT WHEN affected_rows = 0;
    
--   END LOOP;
  
--   RAISE NOTICE 'Update process completed at %', clock_timestamp();
--   RAISE NOTICE 'Total duration: %', clock_timestamp() - start_time;
--   RAISE NOTICE 'Total rows updated: %', total_updated;
  
-- END $$;

-- ALTER TABLE "web3platform_tx_action_address" ALTER COLUMN "block_number" SET NOT NULL;--> statement-breakpoint
-- ALTER TABLE "web3platform_tx_action_address" ALTER COLUMN "asset_id" SET NOT NULL;
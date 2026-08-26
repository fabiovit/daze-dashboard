# DAZE Dashboard FAQ

## Does DAZE Dashboard replace ha-daze?

No. DAZE Dashboard is a presentation layer and requires `ha-daze` for DAZE wallbox
data.

## Does DAZE Dashboard contact the DAZE cloud directly?

No. It reads data already available inside Home Assistant.

## Does it contain personal entity IDs?

No. Compatible entities are discovered from the Home Assistant entity registry using
generic `ha-daze` unique-id keys.

## Is YAML required?

No. Installation and configuration use the Home Assistant UI.

## Are live session statistics persistent?

The live timer and live-average power are browser-panel session values. They reset
when the panel is reloaded.

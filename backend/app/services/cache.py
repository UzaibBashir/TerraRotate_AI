"""Small process-local TTL cache for public NASA API responses."""
from collections import OrderedDict
from functools import wraps
import threading
import time


def ttl_cache(seconds: int, max_entries: int = 256):
    """Cache successful calls by arguments; errors are never cached.

    This reduces repeat requests during demos. Entries are per process, bounded,
    and deliberately disposable; it is not a substitute for shared persistence.
    """
    def decorate(function):
        entries = OrderedDict()
        lock = threading.RLock()

        @wraps(function)
        def wrapped(*args, **kwargs):
            key = (args, tuple(sorted(kwargs.items())))
            now = time.monotonic()
            with lock:
                found = entries.get(key)
                if found and found[0] > now:
                    entries.move_to_end(key)
                    return found[1]
                if found:
                    entries.pop(key, None)
            result = function(*args, **kwargs)
            with lock:
                entries[key] = (time.monotonic() + seconds, result)
                entries.move_to_end(key)
                while len(entries) > max_entries:
                    entries.popitem(last=False)
            return result

        wrapped.cache_clear = lambda: entries.clear()
        return wrapped
    return decorate

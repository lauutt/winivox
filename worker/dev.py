from watchfiles import run_process


def _run_worker() -> None:
    from worker import main

    main()


def run() -> None:
    run_process("/app", target=_run_worker)


if __name__ == "__main__":
    run()

import logging
from pathlib import Path
from shutil import rmtree
from typing import Literal, Optional

import click
import numpy as np
np.random.seed(42)  # For reproducibility in any random operations

from scanomatic.models.compile_project_model import COMPILE_ACTION, FIXTURE
from scanomatic.models.factories.analysis_factories import AnalysisModelFactory
from scanomatic.models.factories.compile_project_factory import CompileProjectFactory
from scanomatic.models.factories.features_factory import FeaturesFactory
from scanomatic.models.factories.rpc_job_factory import RPC_Job_Model_Factory
from scanomatic.models.validators.validate import validate
from scanomatic.server.analysis_effector import AnalysisEffector
from scanomatic.server.compile_effector import CompileProjectEffector
from scanomatic.server.phenotype_effector import PhenotypeExtractionEffector


@click.group()
def cli(): ...


@cli.command()
@click.argument(
    "project_path",
    required=True,
    type=click.Path(exists=True, file_okay=False, path_type=Path),
)
@click.option(
    "--fixture",
    type=str,
    help="Name of the fixture to use for the compilation (optional)",
)
@click.option(
    "--image-ranges",
    help="Comma-separated list of image index ranges to compile (0-based inclusive, e.g., '0-10,20-30')",
    type=str,
)
@click.option(
    "--log-level",
    help="Set the logging level",
    type=click.Choice(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]),
    default="INFO",
)
def compile(project_path: Path, fixture: Optional[str], image_ranges: Optional[str], log_level: str):
    logging.basicConfig(level=getattr(logging, log_level))
    logger = logging.getLogger("Compile CLI")
    include_indices = []
    for part in (image_ranges or "").split(","):
        parts = part.strip().split("-")
        if len(parts) > 2 or not all(p.isdigit() for p in parts):
            raise click.ClickException(f"Invalid image range format: '{part}'")
        if len(parts) == 2:
            start, end = map(int, parts)
            include_indices.extend(range(start, end))
        elif len(parts) == 1:
            index = int(parts[0])
            include_indices.append(index)

    images = [
        {"path": p, "index": i} for i, p in enumerate(project_path.glob("*.tiff"))
        if image_ranges is None or i in include_indices
    ]

    if not images:
        raise click.ClickException(f"No TIFF images found in {project_path}")

    compilation_model = CompileProjectFactory.create(
        compile_action=COMPILE_ACTION.Initiate.name,
        images=images,
        fixture_type=FIXTURE.Local if fixture is None else FIXTURE.Global.name,
        fixture_name=fixture,
        path=str(project_path),
    )

    if not validate(compilation_model):
        raise click.ClickException("Invalid compilation model")

    compile_job = RPC_Job_Model_Factory.create(id="cli_compile", content_model=compilation_model)

    if not validate(compile_job):
        raise click.UsageError("Invalid compilation job")

    compile_effector = CompileProjectEffector(compile_job)
    compile_effector.setup(compile_job)

    for _ in compile_effector:
        ...


@cli.command()
@click.argument(
    "compilation",
    required=True,
    type=click.Path(exists=True, dir_okay=False, path_type=Path),
)
@click.option(
    "--compile-instructions",
    help="Path to the compile instructions file",
    type=click.Path(exists=True),
)
@click.option(
    "--output",
    help="Set the output directory",
    type=str,
    default="analysis",
)
@click.option(
    "--grid",
    help="Set the grid mode",
    type=click.Choice(["once", "dynamic"]),
    default="once",
)
@click.option(
    "--grayscale",
    help="Set the grayscale mode",
    type=click.Choice(["once", "dynamic"]),
    default="once",
)
@click.option(
    "--log-level",
    help="Set the logging level",
    type=click.Choice(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]),
    default="INFO",
)
@click.option(
    "--overwrite",
    is_flag=True,
    default=False,
    help="Overwrite existing output directory without confirmation",
)
# @click.option('--chain', is_flag=True, default=False)
def analysis(
    compilation: Path,
    compile_instructions: Optional[Path],
    output: Optional[str],
    grid: Literal["once", "dynamic"],
    grayscale: Literal["once", "dynamic"],
    log_level: str,
    overwrite: bool,
):
    logging.basicConfig(level=getattr(logging, log_level))
    logger = logging.getLogger("Analysis CLI")
    project_root = compilation.parent.resolve()
    project_name = compilation.name.removesuffix(".project.compilation")
    project_path = project_root / (output or "analysis")

    logger.info(f"Starting analysis for project: {project_name}")

    if not compilation.name.endswith(".project.compilation"):
        raise click.ClickException("Compilation file must end with .project.compilation")

    if compile_instructions is None:
        compile_instructions = project_root / f"{project_name}.project.compilation.instructions"

    if not compile_instructions.is_file():
        raise click.ClickException(f"Compile instructions file not found: {compile_instructions}")

    if project_path.exists():
        if overwrite or click.confirm(
            f"Output directory '{output}' already exists. Do you want to overwrite it?",
            abort=True,
        ):
            rmtree(project_path)
        else:
            raise click.ClickException(f"Output directory already exists: {output}")

    analysis_model = AnalysisModelFactory.create(
        compilation=str(compilation),
        compile_instructions=str(compile_instructions),
        one_time_positioning=grid == "once",
        one_time_grayscale=grayscale == "once",
        output_directory=output,
        chain=False,
    )

    if not validate(analysis_model):
        raise click.ClickException("Invalid analysis model")

    analysis_job = RPC_Job_Model_Factory.create(id="cli_analysis", content_model=analysis_model)

    if not validate(analysis_job):
        raise click.UsageError("Invalid analysis job")

    analysis_effector = AnalysisEffector(analysis_job)
    analysis_effector.setup()

    for _ in analysis_effector:
        ...

@cli.command()
@click.option(
     "--analysis-directory",
     help="Path to the analysis directory containing the data for feature extraction",
     type=click.Path(exists=True, file_okay=False, path_type=Path),
     default="analysis",
)
@click.option(
    "--try-keep-qc",
    is_flag=True,
    default=False,
    help="Try to keep QC data during feature extraction."
)
@click.option(
    "--log-level",
    help="Set the logging level",
    type=click.Choice(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]),
    default="INFO",
)
def features(log_level: str, analysis_directory: str, try_keep_qc: bool):
    logging.basicConfig(level=getattr(logging, log_level))
    logger = logging.getLogger("Features CLI")
    logger.info(f"Starting feature extraction for analysis directory: {analysis_directory}")
    features_model = FeaturesFactory.create(
        analysis_directory=analysis_directory,
        try_keep_qc=try_keep_qc,
    )
    if not validate(features_model):
        raise click.ClickException("Invalid features model")
    features_job = RPC_Job_Model_Factory.create(id="cli_features", content_model=features_model)
    if not validate(features_job):
        raise click.UsageError("Invalid features job")
    features_effector = PhenotypeExtractionEffector(features_job)
    for _ in features_effector:
        ...


@cli.command()
@click.argument(
    "path_a",
    required=True,
    type=click.Path(exists=True, file_okay=False, path_type=Path),
)
@click.argument(
    "path_b",
    required=True,
    type=click.Path(exists=True, file_okay=False, path_type=Path),
)
def validate_analysis(path_a: Path, path_b: Path):
    logger = logging.getLogger("Validation CLI")
    logger.info(f"Validating analysis outputs: {path_a.name} vs {path_b.name}")
    files = sorted({f.name for p in [path_a, path_b] for f in p.glob("*.npy") if f.is_file()})

    for file in files:
        if not (path_a / file).is_file():
            logger.warning(f"File {file} is missing in {path_a.name}")
        if not (path_b / file).is_file():
            logger.warning(f"File {file} is missing in {path_b.name}")
        try:
            a = np.load(path_a / file, allow_pickle=True)
            b = np.load(path_b / file, allow_pickle=True)
            np.testing.assert_array_equal(a, b)
        except AssertionError as exc:
            logger.error(f"File {file} differs between directories")
            # logger.exception(exc)
        except Exception as exc:
            logger.exception(f"Error comparing file {file}: {exc}")

if __name__ == "__main__":
    cli()